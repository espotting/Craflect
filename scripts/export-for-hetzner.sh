#!/bin/bash
echo "Préparation export Hetzner..."
echo ""
echo "Vérification des fichiers..."
echo "=== Workers ==="
ls -la server/workers/
echo ""
echo "=== Config ==="
ls -la server/config/
echo ""
echo "=== Migrations ==="
ls -la migrations/
echo ""
echo "=== Docker ==="
ls -la docker-compose.yml
echo ""
echo "✅ Prêt pour transfert"
echo ""
echo "Commande pour Hetzner :"
echo "  scp -r /home/runner/votre-projet/* root@IP_HETZNER:/root/craflect/"
