# Quick Setup Guide

## Installation Steps

1. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb alphabet_game
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE alphabet_game;
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```
   # Server
   PORT=4000
   
   # PostgreSQL Database
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=alphabet_game
   DB_HOST=localhost
   DB_PORT=5432
   
   # NFT API Configuration (optional)
   NFT_API_URL=http://localhost:4000
   NFT_MINT_ADDRESS=YOUR_NFT_MINT_ADDRESS
   SHARE_TOKEN_MINT=YOUR_SHARE_TOKEN_MINT
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the application:**
   - Main page: http://localhost:4000
   - Admin panel: http://localhost:4000/admin.html
   - Player interface: http://localhost:4000/player.html

## First Time Setup

1. Open admin panel
2. Select a letter (A-Z) to start the game
3. Players can now submit photos!

## NFT API Integration

The game is configured to work with the NFT fractionalization API. Make sure your NFT API is running and accessible at the `NFT_API_URL` specified in your `.env` file.

The game will automatically distribute NFT rewards when a winner is approved.

