package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	_ "github.com/lib/pq"
)

const (
	MAX_WORKERS         = 25
	CONTAINER_LIFETIME  = 90 * time.Second
	POLL_INTERVAL       = 5 * time.Second
	ENCRYPTION_SECRET   = "ImperialTrade_BrokerEncryption_2025_v1"
	LAUNCH_INI_TEMPLATE = `[Common]
Login=%s
Password=%s
Server=%s
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co
`
)

type BrokerConnection struct {
	ID             string
	UserID         string
	BrokerName     string
	EncryptedLogin string
	EncryptedPass  string
	EncryptedSrv   string
	Login          string // Decrypted
	Password       string // Decrypted
	Server         string // Decrypted
	SyncPriority   int
}

var (
	dockerClient *client.Client
	db           *sql.DB
	activeContainers = make(map[string]*ContainerInfo)
	containerMutex   sync.RWMutex
)

type ContainerInfo struct {
	ID        string
	ConnID    string
	StartTime time.Time
	StopTimer *time.Timer
}

func main() {
	var err error

	// Initialize Docker client
	dockerClient, err = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("❌ Failed to create Docker client: %v", err)
	}
	log.Println("✅ Docker client initialized")

	// Initialize database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default connection string - UPDATE WITH YOUR SUPABASE CREDENTIALS
		dbURL = "postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
		log.Println("⚠️  Using default DATABASE_URL - please set environment variable")
	}

	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err = db.Ping(); err != nil {
		log.Fatalf("❌ Failed to ping database: %v", err)
	}
	log.Println("✅ Database connection established")

	log.Println("🚀 Imperial Brain Online. Managing Worker Pool...")
	log.Printf("📊 Max Workers: %d | Container Lifetime: %v | Poll Interval: %v\n", MAX_WORKERS, CONTAINER_LIFETIME, POLL_INTERVAL)

	// Start container cleanup goroutine
	go cleanupZombieContainers()

	// Main loop
	for {
		containerMutex.RLock()
		activeCount := len(activeContainers)
		containerMutex.RUnlock()

		if activeCount < MAX_WORKERS {
			connections, err := fetchNextSyncTasks(MAX_WORKERS - activeCount)
			if err != nil {
				log.Printf("⚠️  Error fetching sync tasks: %v", err)
			} else {
				for _, conn := range connections {
					go launchWorker(conn)
				}
			}
		}

		time.Sleep(POLL_INTERVAL)
	}
}

func fetchNextSyncTasks(limit int) ([]*BrokerConnection, error) {
	query := `
		SELECT 
			id, user_id, COALESCE(broker_name, 'Unknown') as broker_name, 
			encrypted_login, encrypted_password, encrypted_server,
			sync_priority
		FROM next_sync_task
		LIMIT $1
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer rows.Close()

	var connections []*BrokerConnection
	for rows.Next() {
		var conn BrokerConnection
		var brokerName sql.NullString
		err := rows.Scan(
			&conn.ID, &conn.UserID, &brokerName,
			&conn.EncryptedLogin, &conn.EncryptedPass, &conn.EncryptedSrv,
			&conn.SyncPriority,
		)
		if err == nil {
			conn.BrokerName = brokerName.String
		}
		if err != nil {
			log.Printf("⚠️  Error scanning row: %v", err)
			continue
		}

		// Decrypt credentials
		conn.Login = decryptCredentials(conn.EncryptedLogin, conn.UserID)
		conn.Password = decryptCredentials(conn.EncryptedPass, conn.UserID)
		conn.Server = decryptCredentials(conn.EncryptedSrv, conn.UserID)

		connections = append(connections, &conn)
	}

	return connections, nil
}

func decryptCredentials(encryptedData string, userID string) string {
	if encryptedData == "" {
		return ""
	}

	// Check if it's plain text (not base64)
	decoded, err := base64.StdEncoding.DecodeString(encryptedData)
	if err != nil || len(decoded) < 28 {
		// Plain text, return as-is
		return encryptedData
	}

	// Decrypt using AES-256-GCM
	key := deriveKey(userID)
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("⚠️  Failed to create cipher: %v", err)
		return encryptedData // Return encrypted if decryption fails
	}

	// Extract IV (first 12 bytes) and ciphertext
	iv := decoded[:12]
	ciphertext := decoded[12:]

	// GCM auth tag is last 16 bytes
	if len(ciphertext) < 16 {
		return encryptedData
	}
	authTag := ciphertext[len(ciphertext)-16:]
	ciphertext = ciphertext[:len(ciphertext)-16]

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("⚠️  Failed to create GCM: %v", err)
		return encryptedData
	}

	// Combine ciphertext and auth tag
	ciphertextWithTag := append(ciphertext, authTag...)
	plaintext, err := aesgcm.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		log.Printf("⚠️  Decryption failed: %v", err)
		return encryptedData
	}

	return string(plaintext)
}

func deriveKey(userID string) []byte {
	keyMaterial := fmt.Sprintf("%s-%s", userID, ENCRYPTION_SECRET)
	hash := sha256.Sum256([]byte(keyMaterial))
	return hash[:]
}

func launchWorker(conn *BrokerConnection) {
	ctx := context.Background()

	// Check if container already exists for this connection
	containerMutex.RLock()
	if _, exists := activeContainers[conn.ID]; exists {
		containerMutex.RUnlock()
		log.Printf("⚠️  Container already running for connection %s", conn.ID)
		return
	}
	containerMutex.RUnlock()

	// Mark as syncing and set status to connecting
	_, err := db.Exec("UPDATE broker_connections SET is_syncing = true, connection_status = 'connecting' WHERE id = $1", conn.ID)
	if err != nil {
		log.Printf("⚠️  Failed to mark connection as syncing: %v", err)
	}

	// Create launch.ini
	iniPath := filepath.Join("/root/imperial-factory/config", fmt.Sprintf("launch_%s.ini", conn.ID))
	err = createLaunchIni(iniPath, conn)
	if err != nil {
		log.Printf("❌ Failed to create launch.ini: %v", err)
		return
	}

	// Create container
	resp, err := dockerClient.ContainerCreate(ctx, &container.Config{
		Image: "imperial-mt5-worker",
		Env: []string{
			fmt.Sprintf("CONN_ID=%s", conn.ID),
		},
	}, &container.HostConfig{
		Binds: []string{
			fmt.Sprintf("%s:/mt5/config/launch.ini:ro", iniPath),
		},
		AutoRemove: false, // We'll remove manually
	}, nil, nil, fmt.Sprintf("worker_%s", conn.ID))

	if err != nil {
		log.Printf("❌ Failed to create container: %v", err)
		_, _ = db.Exec("UPDATE broker_connections SET is_syncing = false, connection_status = 'failed', last_error = $2 WHERE id = $1", conn.ID, fmt.Sprintf("Docker container creation failed: %v", err))
		return
	}

	// Start container
	err = dockerClient.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
	if err != nil {
		log.Printf("❌ Failed to start container: %v", err)
		dockerClient.ContainerRemove(ctx, resp.ID, types.ContainerRemoveOptions{Force: true})
		_, _ = db.Exec("UPDATE broker_connections SET is_syncing = false, connection_status = 'failed', last_error = $2 WHERE id = $1", conn.ID, fmt.Sprintf("Docker container start failed: %v", err))
		return
	}

	log.Printf("⚡ Fast Sync Started for: %s (Login: %s, Container: %s)", conn.BrokerName, conn.Login, resp.ID[:12])

	// Register container
	containerMutex.Lock()
	stopTimer := time.AfterFunc(CONTAINER_LIFETIME, func() {
		stopContainer(conn.ID, resp.ID)
	})
	activeContainers[conn.ID] = &ContainerInfo{
		ID:        resp.ID,
		ConnID:    conn.ID,
		StartTime: time.Now(),
		StopTimer: stopTimer,
	}
	containerMutex.Unlock()
}

func createLaunchIni(path string, conn *BrokerConnection) error {
	content := fmt.Sprintf(LAUNCH_INI_TEMPLATE, conn.Login, conn.Password, conn.Server)
	return ioutil.WriteFile(path, []byte(content), 0644)
}

func stopContainer(connID, containerID string) {
	ctx := context.Background()

	log.Printf("🛑 Stopping container %s (Connection: %s)", containerID[:12], connID)

	// Remove from active containers
	containerMutex.Lock()
	delete(activeContainers, connID)
	containerMutex.Unlock()

	// Stop and remove container
	err := dockerClient.ContainerStop(ctx, containerID, container.StopOptions{})
	if err != nil {
		log.Printf("⚠️  Error stopping container: %v", err)
	}

	err = dockerClient.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{Force: true})
	if err != nil {
		log.Printf("⚠️  Error removing container: %v", err)
	} else {
		log.Printf("✅ Container removed: %s", containerID[:12])
	}

	// Clear syncing flag - connection_status will be updated by mt5-sync when trades arrive
	// If no trades arrive within timeout, status remains 'connecting' (will be handled by timeout logic)
	_, _ = db.Exec("UPDATE broker_connections SET is_syncing = false WHERE id = $1", connID)

	// Clean up launch.ini
	iniPath := filepath.Join("/root/imperial-factory/config", fmt.Sprintf("launch_%s.ini", connID))
	_ = os.Remove(iniPath)
}

func cleanupZombieContainers() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		containerFilters := filters.NewArgs()
		containerFilters.Add("name", "worker_")
		containers, err := dockerClient.ContainerList(ctx, types.ContainerListOptions{
			All:     true,
			Filters: containerFilters,
		})
		if err != nil {
			continue
		}

		for _, c := range containers {
			// Check if container is in our active list
			containerMutex.RLock()
			found := false
			for _, info := range activeContainers {
				if info.ID == c.ID {
					found = true
					break
				}
			}
			containerMutex.RUnlock()

			// Remove zombie containers
			if !found && strings.HasPrefix(c.Names[0], "/worker_") {
				log.Printf("🧹 Cleaning up zombie container: %s", c.ID[:12])
				_ = dockerClient.ContainerRemove(ctx, c.ID, types.ContainerRemoveOptions{Force: true})
			}
		}
	}
}
