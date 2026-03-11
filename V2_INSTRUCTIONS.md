# INSTRUCTIONS IMPLEMENTATION CRAFLECT V2.0

## ÉTAPES À SUIVRE :

### 1. Installation dépendances
Dans le shell Replit :
npm install bullmq ioredis ollama

### 2. Création arborescence
Créer les dossiers :
- /server/config/
- /server/workers/
- /migrations/ (si inexistant)

### 3. Copie des fichiers
Copier chaque fichier fourni dans son chemin exact.

### 4. Mise à jour schema.ts
Ajouter dans /shared/schema.ts si manquant :
- Export geoZones
- Colonnes geo dans videos (geoZone, geoCountry, geoLanguage, targetMarkets, isArchived, confidence)

### 5. Exécution migrations
Dans l'outil Database de Replit :
1. Exécuter 0001_cleanup.sql (supprime les 740 vidéos legacy)
2. Exécuter 0002_geo_v2.sql (crée structure v2)

### 6. Test local
npm run workers:dev
Vérifier démarrage sans erreur.

### 7. Export
Préparer zip pour Hetzner (inclure docker-compose.yml à la racine).
