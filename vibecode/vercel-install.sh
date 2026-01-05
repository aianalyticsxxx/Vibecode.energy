#!/bin/bash
# Vercel install script - runs pnpm install without frozen lockfile
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install --no-frozen-lockfile
