package main

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/lib/pq"
)

// Supabase Edge Function configuration
const (
	SUPABASE_FUNCTION_URL = "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync"
	INGEST_SECRET_KEY     = "Imperial_Secret_2026"
)

// =============================================================================
// CONFIGURATION - Optimized for Production
// =============================================================================

const (
	// Worker limits
	MAX_WORKERS           = 400
	MAX_CONCURRENT_STARTS = 10 // Limit concurrent container starts to prevent overload
	
	// Container lifecycle
	CONTAINER_MAX_LIFETIME    = 5 * time.Minute  // Max time before force cleanup
	MIN_SYNC_TIME_AFTER_CONN  = 30 * time.Second // Minimum time after connected before cleanup
	
	// Polling and checks
	SYNC_CHECK_INTERVAL       = 2 * time.Second  // Check every 2 seconds (reduced from 1s for stability)
	POLL_INTERVAL             = 15 * time.Second // Fallback polling interval
	HEALTH_CHECK_INTERVAL     = 30 * time.Second // Health check interval
	
	// Retry configuration
	MAX_CONTAINER_RETRIES     = 3
	RETRY_DELAY               = 5 * time.Second
	
	// Realtime reconnection
	REALTIME_MIN_RECONNECT    = 2 * time.Second
	REALTIME_MAX_RECONNECT    = 10 * time.Second
	
	// MT5 Launch config template
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

[Chart1]
Symbol=EURUSD
Period=M1
Expert=ImperialSync
`
)

// =============================================================================
// GLOBAL STATE
// =============================================================================

var (
	ENCRYPTION_SECRET = getEncryptionSecret()
	
	dockerClient      *client.Client
	db                *sql.DB
	
	// Container tracking with mutex protection
	activeContainers  = make(map[string]*ContainerInfo)
	containerMutex    sync.RWMutex
	
	// Realtime connection state
	realtimeConnected = false
	realtimeMutex     sync.RWMutex
	
	// Rate limiting for container starts
	startSemaphore    = make(chan struct{}, MAX_CONCURRENT_STARTS)
	
	// Metrics
	totalSyncsStarted   int64
	totalSyncsCompleted int64
	totalSyncsFailed    int64
	currentActiveCount  int64
)

func getEncryptionSecret() string {
	secret := os.Getenv("ENCRYPTION_SECRET")
	if secret == "" {
		return "ImperialTrade_BrokerEncryption_2025_v1"
	}
	return secret
}

// =============================================================================
// DATA STRUCTURES
// =============================================================================

type BrokerConnection struct {
	ID             string
	UserID         string
	BrokerName     string
	EncryptedLogin string
	EncryptedPass  string
	EncryptedSrv   string
	Login          string
	Password       string
	Server         string
	SyncPriority   int
}

type ContainerInfo struct {
	ID          string
	ConnID      string
	StartTime   time.Time
	ConnectedAt time.Time
	RetryCount  int
	Status      string // "starting", "running", "connected", "syncing", "cleanup"
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Println("═══════════════════════════════════════════════════════════════")
	log.Println("     IMPERIAL BRAIN v2.0 - Production Grade MT5 Orchestrator   ")
	log.Println("═══════════════════════════════════════════════════════════════")
	
	var err error

	// Initialize Docker client with retry
	for i := 0; i < 3; i++ {
		dockerClient, err = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err == nil {
			break
		}
		log.Printf("[WARN] Docker client init attempt %d failed: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("[FATAL] Failed to create Docker client after 3 attempts: %v", err)
	}
	log.Println("[OK] Docker client initialized")

	// Verify Docker is responsive
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	_, err = dockerClient.Ping(ctx)
	cancel()
	if err != nil {
		log.Fatalf("[FATAL] Docker daemon not responding: %v", err)
	}
	log.Println("[OK] Docker daemon responsive")

	// Initialize database connection with retry
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("[FATAL] DATABASE_URL environment variable not set")
	}
	
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				break
			}
		}
		log.Printf("[WARN] Database connection attempt %d failed: %v", i+1, err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("[FATAL] Failed to connect to database after 5 attempts: %v", err)
	}
	
	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	log.Println("[OK] Database connection established")

	// Cleanup any orphaned containers from previous runs
	cleanupOrphanedContainers()

	// Print configuration
	log.Println("─────────────────────────────────────────────────────────────────")
	log.Printf("[CONFIG] Max Workers: %d | Concurrent Starts: %d", MAX_WORKERS, MAX_CONCURRENT_STARTS)
	log.Printf("[CONFIG] Max Container Lifetime: %v | Min Sync Time: %v", CONTAINER_MAX_LIFETIME, MIN_SYNC_TIME_AFTER_CONN)
	log.Printf("[CONFIG] Max Retries: %d | Health Check Interval: %v", MAX_CONTAINER_RETRIES, HEALTH_CHECK_INTERVAL)
	log.Println("─────────────────────────────────────────────────────────────────")

	// Start background workers
	go realtimeListener()
	go fallbackPoller()
	go healthMonitor()
	go metricsLogger()

	log.Println("[READY] Imperial Brain is now accepting sync requests")

	// Block forever
	select {}
}

// =============================================================================
// CLEANUP ORPHANED CONTAINERS
// =============================================================================

func cleanupOrphanedContainers() {
	ctx := context.Background()
	
	// Find all containers with our naming pattern
	containers, err := dockerClient.ContainerList(ctx, types.ContainerListOptions{
		All: true,
		Filters: filters.NewArgs(filters.Arg("name", "worker_")),
	})
	if err != nil {
		log.Printf("[WARN] Failed to list containers for cleanup: %v", err)
		return
	}
	
	if len(containers) > 0 {
		log.Printf("[CLEANUP] Found %d orphaned containers from previous run", len(containers))
		for _, c := range containers {
			log.Printf("[CLEANUP] Removing orphaned container: %s", c.Names[0])
			dockerClient.ContainerRemove(ctx, c.ID, types.ContainerRemoveOptions{Force: true})
		}
		log.Println("[CLEANUP] Orphaned containers removed")
	}
}

// =============================================================================
// REALTIME LISTENER (Primary)
// =============================================================================

func realtimeListener() {
	listenerURL := os.Getenv("LISTENER_DATABASE_URL")
	if listenerURL == "" {
		listenerURL = os.Getenv("DATABASE_URL")
	}

	reconnectDelay := REALTIME_MIN_RECONNECT

	for {
		func() {
			reportConnectedState(false)
			
			listener := pq.NewListener(listenerURL, 10*time.Second, time.Minute,
				func(ev pq.ListenerEventType, err error) {
					if err != nil {
						log.Printf("[REALTIME] Event error: %v", err)
					}
				})
			defer listener.Close()

			if err := listener.Listen("sync_task_created"); err != nil {
				log.Printf("[REALTIME] Listen error: %v", err)
				return
			}

			reportConnectedState(true)
			log.Println("[REALTIME] ✓ Connected and listening for sync requests")
			reconnectDelay = REALTIME_MIN_RECONNECT

			for {
				select {
				case notification := <-listener.Notify:
					if notification == nil {
						log.Println("[REALTIME] Connection lost (nil notification)")
						return
					}
					
					connID := strings.TrimSpace(notification.Extra)
					if connID != "" {
						log.Printf("[REALTIME] → Sync request received: %s", connID)
						go handleSyncRequest(connID)
					}
					
				case <-time.After(90 * time.Second):
					// Keepalive ping
					if err := listener.Ping(); err != nil {
						log.Printf("[REALTIME] Ping failed: %v", err)
						return
					}
				}
			}
		}()

		reportConnectedState(false)
		log.Printf("[REALTIME] Reconnecting in %v...", reconnectDelay)
		time.Sleep(reconnectDelay)
		
		// Exponential backoff
		reconnectDelay = reconnectDelay * 2
		if reconnectDelay > REALTIME_MAX_RECONNECT {
			reconnectDelay = REALTIME_MAX_RECONNECT
		}
	}
}

func reportConnectedState(connected bool) {
	realtimeMutex.Lock()
	realtimeConnected = connected
	realtimeMutex.Unlock()
}

// =============================================================================
// FALLBACK POLLER (Secondary)
// =============================================================================

func fallbackPoller() {
	ticker := time.NewTicker(POLL_INTERVAL)
	defer ticker.Stop()

	for range ticker.C {
		realtimeMutex.RLock()
		connected := realtimeConnected
		realtimeMutex.RUnlock()

		if !connected {
			log.Println("[POLLER] Realtime disconnected, polling for pending syncs...")
			processPendingSyncs()
		}
	}
}

func processPendingSyncs() {
	connections, err := getPendingConnections()
	if err != nil {
		log.Printf("[POLLER] Error fetching pending connections: %v", err)
		return
	}

	for _, conn := range connections {
		go handleSyncRequest(conn.ID)
	}
}

// =============================================================================
// HEALTH MONITOR
// =============================================================================

func healthMonitor() {
	ticker := time.NewTicker(HEALTH_CHECK_INTERVAL)
	defer ticker.Stop()

	for range ticker.C {
		// Check Docker health
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := dockerClient.Ping(ctx)
		cancel()
		if err != nil {
			log.Printf("[HEALTH] ⚠ Docker daemon not responding: %v", err)
		}
		
		// Check database health
		if err := db.Ping(); err != nil {
			log.Printf("[HEALTH] ⚠ Database not responding: %v", err)
		}
		
		// Check for stuck containers
		checkStuckContainers()
	}
}

func checkStuckContainers() {
	containerMutex.RLock()
	defer containerMutex.RUnlock()
	
	now := time.Now()
	for connID, info := range activeContainers {
		age := now.Sub(info.StartTime)
		if age > CONTAINER_MAX_LIFETIME {
			log.Printf("[HEALTH] ⚠ Container stuck for %s: %v (will be force-cleaned)", connID, age)
		}
	}
}

// =============================================================================
// METRICS LOGGER
// =============================================================================

func metricsLogger() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		started := atomic.LoadInt64(&totalSyncsStarted)
		completed := atomic.LoadInt64(&totalSyncsCompleted)
		failed := atomic.LoadInt64(&totalSyncsFailed)
		active := atomic.LoadInt64(&currentActiveCount)
		
		log.Printf("[METRICS] Active: %d | Started: %d | Completed: %d | Failed: %d | Success Rate: %.1f%%",
			active, started, completed, failed, 
			float64(completed)/float64(max(started, 1))*100)
	}
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

// =============================================================================
// SYNC REQUEST HANDLER (Main Entry Point)
// =============================================================================

// Debounce map to prevent duplicate requests within a short window
var (
	lastSyncRequest   = make(map[string]time.Time)
	lastSyncMutex     sync.RWMutex
	DEBOUNCE_INTERVAL = 10 * time.Second // Ignore duplicate requests within 10s
)

func handleSyncRequest(connID string) {
	// Debounce: Ignore if we received a request for this connection recently
	lastSyncMutex.Lock()
	if lastTime, exists := lastSyncRequest[connID]; exists {
		if time.Since(lastTime) < DEBOUNCE_INTERVAL {
			lastSyncMutex.Unlock()
			log.Printf("[SYNC] Debounced duplicate request for %s (last: %v ago)", connID, time.Since(lastTime).Round(time.Second))
			return
		}
	}
	lastSyncRequest[connID] = time.Now()
	lastSyncMutex.Unlock()
	
	// Check if already processing
	containerMutex.RLock()
	if _, exists := activeContainers[connID]; exists {
		containerMutex.RUnlock()
		log.Printf("[SYNC] Container already running for %s, skipping", connID)
		return
	}
	containerMutex.RUnlock()
	
	// Rate limiting - acquire semaphore
	select {
	case startSemaphore <- struct{}{}:
		defer func() { <-startSemaphore }()
	case <-time.After(30 * time.Second):
		log.Printf("[SYNC] Timeout waiting for start slot for %s", connID)
		return
	}
	
	atomic.AddInt64(&totalSyncsStarted, 1)
	atomic.AddInt64(&currentActiveCount, 1)
	defer atomic.AddInt64(&currentActiveCount, -1)
	
	// Fetch connection details
	conn, err := getConnectionByID(connID)
	if err != nil {
		log.Printf("[SYNC] Failed to fetch connection %s: %v", connID, err)
		atomic.AddInt64(&totalSyncsFailed, 1)
		return
	}
	
	if conn == nil {
		log.Printf("[SYNC] Connection not found: %s", connID)
		return
	}
	
	// Launch container with retries
	success := false
	for attempt := 1; attempt <= MAX_CONTAINER_RETRIES; attempt++ {
		if launchContainerWithMonitoring(conn, attempt) {
			success = true
			break
		}
		
		if attempt < MAX_CONTAINER_RETRIES {
			log.Printf("[SYNC] Retry %d/%d for %s in %v", attempt, MAX_CONTAINER_RETRIES, connID, RETRY_DELAY)
			time.Sleep(RETRY_DELAY)
		}
	}
	
	if success {
		atomic.AddInt64(&totalSyncsCompleted, 1)
	} else {
		atomic.AddInt64(&totalSyncsFailed, 1)
		// Mark connection as failed in database
		db.Exec(`UPDATE broker_connections SET 
			connection_status = 'failed', 
			is_syncing = false, 
			last_error = 'Container launch failed after retries' 
			WHERE id = $1`, connID)
	}
}

// =============================================================================
// CONTAINER LAUNCH AND MONITORING
// =============================================================================

func launchContainerWithMonitoring(conn *BrokerConnection, attempt int) bool {
	ctx := context.Background()
	containerName := fmt.Sprintf("worker_%s", conn.ID)
	
	// Mark as syncing
	db.Exec(`UPDATE broker_connections SET 
		is_syncing = true, 
		connection_status = 'connecting', 
		sync_priority = 5,
		last_error = NULL 
		WHERE id = $1`, conn.ID)
	
	// Create launch.ini config file
	iniPath := filepath.Join("/root/imperial-factory/config", fmt.Sprintf("launch_%s.ini", conn.ID))
	if err := createLaunchIni(iniPath, conn); err != nil {
		log.Printf("[CONTAINER] Failed to create config for %s: %v", conn.ID, err)
		return false
	}
	
	// Create shared data folder for File-Relay pattern
	sharedDataPath := filepath.Join("/root/imperial-factory/workers-data", conn.ID)
	if err := os.MkdirAll(sharedDataPath, 0755); err != nil {
		log.Printf("[CONTAINER] Failed to create shared data folder for %s: %v", conn.ID, err)
		return false
	}
	// Clean up any previous sync files
	os.Remove(filepath.Join(sharedDataPath, "sync_done.txt"))
	os.Remove(filepath.Join(sharedDataPath, "sync_data.json"))
	
	// Determine broker-specific speed file (servers.dat)
	// This contains pre-cached server IPs for instant connection
	brokerFolder := "xs" // Default to XS
	if strings.Contains(strings.ToUpper(conn.BrokerName), "EC") || 
	   strings.Contains(strings.ToUpper(conn.Server), "ECMARKET") {
		brokerFolder = "ec"
	}
	speedFilePath := filepath.Join("/root/imperial-factory/broker-configs", brokerFolder, "servers.dat")
	
	// Check if speed file exists, fall back to master if not
	if _, err := os.Stat(speedFilePath); os.IsNotExist(err) {
		speedFilePath = "/root/imperial-factory/mt5-master/config/servers.dat"
		log.Printf("[CONTAINER] Using master servers.dat (broker-specific not found for %s)", brokerFolder)
	} else {
		log.Printf("[CONTAINER] Using broker-specific speed file: %s", brokerFolder)
	}
	
	// Remove any existing container with same name
	dockerClient.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})
	
	// Create container with File-Relay mount and Speed File injection
	startTime := time.Now()
	resp, err := dockerClient.ContainerCreate(ctx, &container.Config{
		Image: "imperial-mt5-worker:latest",
		Env: []string{
			fmt.Sprintf("CONN_ID=%s", conn.ID),
		},
	}, &container.HostConfig{
		Binds: []string{
			fmt.Sprintf("%s:/mt5/config/launch.ini:ro", iniPath),
			// Speed File: Inject broker-specific servers.dat for instant connection
			fmt.Sprintf("%s:/mt5/config/servers.dat:ro", speedFilePath),
			// File-Relay: Mount shared folder for EA to write trade data
			fmt.Sprintf("%s:/root/.wine/drive_c/users/root/AppData/Roaming/MetaQuotes/Terminal/Common/Files", sharedDataPath),
		},
		AutoRemove: false,
		Resources: container.Resources{
			Memory:   512 * 1024 * 1024, // 512MB limit
			NanoCPUs: 1000000000,         // 1 CPU limit
		},
	}, nil, nil, containerName)
	
	if err != nil {
		log.Printf("[CONTAINER] Failed to create container for %s (attempt %d): %v", conn.ID, attempt, err)
		return false
	}
	
	// Start container
	if err := dockerClient.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		log.Printf("[CONTAINER] Failed to start container for %s (attempt %d): %v", conn.ID, attempt, err)
		dockerClient.ContainerRemove(ctx, resp.ID, types.ContainerRemoveOptions{Force: true})
		return false
	}
	
	launchDuration := time.Since(startTime)
	log.Printf("[CONTAINER] ✓ Launched for %s in %v (Account: %s, Container: %s)", 
		conn.ID, launchDuration, conn.Login, resp.ID[:12])
	
	// Register container
	containerMutex.Lock()
	activeContainers[conn.ID] = &ContainerInfo{
		ID:         resp.ID,
		ConnID:     conn.ID,
		StartTime:  time.Now(),
		RetryCount: attempt,
		Status:     "starting",
	}
	containerMutex.Unlock()
	
	// Monitor container until completion
	return monitorContainer(conn.ID, resp.ID)
}

func monitorContainer(connID, containerID string) bool {
	maxLifetime := time.NewTimer(CONTAINER_MAX_LIFETIME)
	defer maxLifetime.Stop()

	ticker := time.NewTicker(SYNC_CHECK_INTERVAL)
	defer ticker.Stop()

	containerStartTime := time.Now()
	var connectedAt time.Time
	sharedDataPath := filepath.Join("/root/imperial-factory/workers-data", connID)
	tradesSynced := false

	for {
		select {
		case <-maxLifetime.C:
			log.Printf("[MONITOR] Max lifetime reached for %s - forcing cleanup", connID)
			cleanupContainer(connID, containerID, "max_lifetime")
			return false

		case <-ticker.C:
			// FILE-RELAY: Check if EA has written sync_done.txt
			syncDonePath := filepath.Join(sharedDataPath, "sync_done.txt")
			syncDataPath := filepath.Join(sharedDataPath, "sync_data.json")
			
			if !tradesSynced {
				if _, err := os.Stat(syncDonePath); err == nil {
					// EA has finished writing - read and push trade data
					log.Printf("[FILE-RELAY] ✓ Sync flag detected for %s", connID)
					
					if data, err := ioutil.ReadFile(syncDataPath); err == nil {
						log.Printf("[FILE-RELAY] Read %d bytes of trade data", len(data))
						
						// Push to Supabase via Edge Function
						if err := pushTradesToSupabase(connID, data); err != nil {
							log.Printf("[FILE-RELAY] ⚠ Push failed: %v", err)
						} else {
							log.Printf("[FILE-RELAY] ✓ Trades pushed to Supabase")
							tradesSynced = true
						}
					} else {
						log.Printf("[FILE-RELAY] ⚠ Failed to read sync_data.json: %v", err)
					}
					
					// Clean up files
					os.Remove(syncDonePath)
					os.Remove(syncDataPath)
				}
			}
			
			var connectionStatus string
			var lastSyncAt sql.NullTime

			err := db.QueryRow(
				"SELECT connection_status, last_sync_at FROM broker_connections WHERE id = $1",
				connID,
			).Scan(&connectionStatus, &lastSyncAt)

			if err != nil {
				log.Printf("[MONITOR] Error checking status for %s: %v", connID, err)
				continue
			}

			// Track when connection becomes 'connected'
			if connectionStatus == "connected" && connectedAt.IsZero() {
				connectedAt = time.Now()
				log.Printf("[MONITOR] %s connected, waiting for trade sync", connID)
				
				// Update container status
				containerMutex.Lock()
				if info, exists := activeContainers[connID]; exists {
					info.Status = "connected"
					info.ConnectedAt = connectedAt
				}
				containerMutex.Unlock()
			}

			// Check cleanup conditions
			if connectionStatus == "connected" {
				shouldCleanup := false
				cleanupReason := ""

				// Condition 1: last_sync_at updated after container started
				if lastSyncAt.Valid && lastSyncAt.Time.After(containerStartTime) {
					shouldCleanup = true
					cleanupReason = "sync_complete"
				}

				// Condition 2: Minimum time after connected elapsed
				if !connectedAt.IsZero() && time.Since(connectedAt) > MIN_SYNC_TIME_AFTER_CONN {
					shouldCleanup = true
					cleanupReason = "min_time_elapsed"
				}

				if shouldCleanup {
					log.Printf("[MONITOR] ✓ Sync complete for %s (%s)", connID, cleanupReason)
					cleanupContainer(connID, containerID, cleanupReason)
					return true
				}
			}

			// Check for failed status
			if connectionStatus == "failed" {
				log.Printf("[MONITOR] Connection failed for %s", connID)
				cleanupContainer(connID, containerID, "connection_failed")
				return false
			}
		}
	}
}

func cleanupContainer(connID, containerID, reason string) {
	ctx := context.Background()

	log.Printf("[CLEANUP] Stopping container %s (%s)", containerID[:12], reason)

	// Remove from tracking
	containerMutex.Lock()
	delete(activeContainers, connID)
	containerMutex.Unlock()

	// Stop and remove container
	stopTimeout := 10
	dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &stopTimeout})
	
	if err := dockerClient.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{Force: true}); err != nil {
		log.Printf("[CLEANUP] Warning - remove failed: %v", err)
	} else {
		log.Printf("[CLEANUP] ✓ Container removed: %s", containerID[:12])
	}

	// Update database
	db.Exec("UPDATE broker_connections SET is_syncing = false WHERE id = $1", connID)
}

// =============================================================================
// DATABASE HELPERS
// =============================================================================

func getConnectionByID(connID string) (*BrokerConnection, error) {
	var conn BrokerConnection
	var brokerName sql.NullString

	err := db.QueryRow(`
		SELECT id, user_id, broker_type, encrypted_login, encrypted_password, encrypted_server, sync_priority 
		FROM broker_connections 
		WHERE id = $1 AND is_active = true
	`, connID).Scan(
		&conn.ID, &conn.UserID, &brokerName,
		&conn.EncryptedLogin, &conn.EncryptedPass, &conn.EncryptedSrv,
		&conn.SyncPriority,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	conn.BrokerName = brokerName.String
	conn.Login = decryptCredentials(conn.EncryptedLogin, conn.UserID)
	conn.Password = decryptCredentials(conn.EncryptedPass, conn.UserID)
	conn.Server = normalizeServerName(decryptCredentials(conn.EncryptedSrv, conn.UserID))

	return &conn, nil
}

func getPendingConnections() ([]*BrokerConnection, error) {
	rows, err := db.Query(`
		SELECT id, user_id, broker_type, encrypted_login, encrypted_password, encrypted_server, sync_priority 
		FROM broker_connections 
		WHERE sync_priority = 1 AND is_syncing = false AND is_active = true
		ORDER BY created_at ASC
		LIMIT 50
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var connections []*BrokerConnection
	for rows.Next() {
		var conn BrokerConnection
		var brokerName sql.NullString
		
		if err := rows.Scan(
			&conn.ID, &conn.UserID, &brokerName,
			&conn.EncryptedLogin, &conn.EncryptedPass, &conn.EncryptedSrv,
			&conn.SyncPriority,
		); err != nil {
			continue
		}

		conn.BrokerName = brokerName.String
		conn.Login = decryptCredentials(conn.EncryptedLogin, conn.UserID)
		conn.Password = decryptCredentials(conn.EncryptedPass, conn.UserID)
		conn.Server = normalizeServerName(decryptCredentials(conn.EncryptedSrv, conn.UserID))
		connections = append(connections, &conn)
	}
	
	return connections, nil
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

func normalizeServerName(server string) string {
	s := strings.TrimSpace(server)
	
	// Fix known problematic server names
	if s == "ECMarkets-MT5-Demo" || s == "ECMarkets-Demo" {
		return "ECMarketsLtd-Demo"
	}
	
	return s
}

func createLaunchIni(path string, conn *BrokerConnection) error {
	content := fmt.Sprintf(LAUNCH_INI_TEMPLATE, conn.Login, conn.Password, conn.Server)
	return ioutil.WriteFile(path, []byte(content), 0644)
}

func decryptCredentials(encrypted, userID string) string {
	if encrypted == "" {
		return ""
	}

	// Frontend uses AES-GCM with base64 encoding
	// Format: base64(IV[12 bytes] + ciphertext + authTag[16 bytes])
	
	// Decode base64
	combined, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		// Not valid base64, might be plaintext or old format
		log.Printf("[DECRYPT] Base64 decode failed for credential, trying as plaintext")
		return encrypted
	}
	
	// Need at least IV (12) + some ciphertext + auth tag (16)
	if len(combined) < 28 {
		log.Printf("[DECRYPT] Encrypted data too short: %d bytes", len(combined))
		return encrypted
	}

	// Derive key from user ID and secret (same as frontend)
	// Frontend: keyMaterial = `${session.user.id}-${secret}`
	keyMaterial := userID + "-" + ENCRYPTION_SECRET
	keyHash := sha256.Sum256([]byte(keyMaterial))
	key := keyHash[:32]

	// Extract IV (first 12 bytes) and ciphertext+tag (rest)
	iv := combined[:12]
	ciphertext := combined[12:]

	// Create AES-GCM cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("[DECRYPT] AES cipher creation failed: %v", err)
		return ""
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("[DECRYPT] GCM mode creation failed: %v", err)
		return ""
	}

	// Decrypt with authentication
	plaintext, err := aesGCM.Open(nil, iv, ciphertext, nil)
	if err != nil {
		log.Printf("[DECRYPT] Decryption failed: %v", err)
		return ""
	}

	return string(plaintext)
}

// =============================================================================
// FILE-RELAY: Push Trades to Supabase
// =============================================================================

func pushTradesToSupabase(connID string, data []byte) error {
	// Create HTTP client with timeout
	client := &http.Client{Timeout: 30 * time.Second}
	
	// Create request
	req, err := http.NewRequest("POST", SUPABASE_FUNCTION_URL, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-ingest-key", INGEST_SECRET_KEY)
	
	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()
	
	// Read response
	body, _ := ioutil.ReadAll(resp.Body)
	
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return fmt.Errorf("supabase returned %d: %s", resp.StatusCode, string(body))
	}
	
	log.Printf("[FILE-RELAY] Supabase response: %s", string(body))
	
	// Update last_sync_at in database
	_, err = db.Exec(`UPDATE broker_connections SET 
		last_sync_at = NOW(),
		connection_status = 'connected',
		is_syncing = false
		WHERE id = $1`, connID)
	if err != nil {
		log.Printf("[FILE-RELAY] Failed to update last_sync_at: %v", err)
	}
	
	return nil
}
