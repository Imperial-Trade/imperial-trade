
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e0239be6-4e0d-42c5-a3c3-ac383083c1b4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e0239be6-4e0d-42c5-a3c3-ac383083c1b4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

**Deploy with Lovable (Recommended)**

Simply open [Lovable](https://lovable.dev/projects/e0239be6-4e0d-42c5-a3c3-ac383083c1b4) and click on Share -> Publish.

**Deploy to DigitalOcean Static Sites**

This project is optimized for deployment on DigitalOcean's Static Sites platform. Follow these steps:

### Prerequisites

1. A DigitalOcean account
2. Access to your Supabase project credentials

### Step 1: Prepare Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 2: Build the Project

```sh
# Install dependencies
npm install

# Build for production
npm run build
```

### Step 3: Deploy to DigitalOcean

1. **Create a new Static Site on DigitalOcean:**
   - Go to your DigitalOcean dashboard
   - Navigate to "Apps" → "Create App"
   - Select "Static Site"

2. **Connect your repository:**
   - Choose GitHub/GitLab as your source
   - Select this repository
   - Choose the main branch

3. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node Version: `18.x` (or latest)

4. **Set environment variables:**
   - In the DigitalOcean app settings, add:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

5. **Deploy:**
   - Click "Create Resources"
   - Wait for the build and deployment to complete

### Step 4: Configure Custom Domain (Optional)

1. In your DigitalOcean app settings, go to "Domains"
2. Add your custom domain
3. Update your DNS records as instructed

### Production Server (Alternative)

If you prefer to run your own server:

```sh
# Build the application
npm run build

# Start the production server
npm start
```

The application will be available at `http://localhost:8080`

### Environment Variables

The application supports the following environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Note:** Environment variables are optional for development as the application includes fallback values for Lovable compatibility.

### Troubleshooting

**Build fails on DigitalOcean:**
- Ensure Node.js version is set to 18.x or higher
- Check that all environment variables are properly set
- Verify build command is `npm run build`

**Application loads but shows connection errors:**
- Verify Supabase environment variables are correct
- Check that your Supabase project is active
- Ensure your domain is added to Supabase allowed origins

**Static files not loading:**
- Verify output directory is set to `dist`
- Check that the build completed successfully
- Ensure all assets are properly included in the build

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
