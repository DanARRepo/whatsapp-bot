#!/bin/bash
# Script para actualizar el bot en el servidor de producción
# Uso: ./scripts/update-server.sh [branch]

set -e  # Salir si hay algún error

BRANCH="${1:-main}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Actualizando bot desde rama: $BRANCH"
echo "📁 Directorio: $REPO_DIR"

cd "$REPO_DIR"

# Verificar que estamos en un repositorio git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: No es un repositorio git"
    exit 1
fi

# Cambiar a la rama especificada
echo "📌 Cambiando a rama: $BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" -t "origin/$BRANCH"

# Obtener los últimos cambios
echo "⬇️  Descargando cambios remotos..."
git fetch origin

# Verificar si hay cambios locales sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Advertencia: Hay cambios locales sin commitear"
    echo "💡 Opciones:"
    echo "   1. Hacer commit de los cambios: git add . && git commit -m 'mensaje'"
    echo "   2. Descartar cambios: git reset --hard HEAD"
    echo "   3. Guardar cambios: git stash"
    exit 1
fi

# Actualizar usando rebase (mantiene historial limpio)
echo "🔄 Aplicando cambios con rebase..."
if git pull --rebase origin "$BRANCH"; then
    echo "✅ Actualización exitosa"
    
    # Reinstalar dependencias si package.json cambió
    if git diff --name-only HEAD@{1} HEAD | grep -q "package.json\|package-lock.json"; then
        echo "📦 package.json cambió, reinstalando dependencias..."
        npm install --legacy-peer-deps
    fi
    
    echo "🎉 Bot actualizado correctamente"
    echo "💡 Reinicia el servicio con: sudo systemctl restart whatsapp-bot"
else
    echo "❌ Error al actualizar. Hay conflictos que resolver manualmente."
    echo "💡 Opciones:"
    echo "   1. Resolver conflictos manualmente y hacer: git rebase --continue"
    echo "   2. Cancelar rebase: git rebase --abort"
    echo "   3. Forzar actualización (pierde cambios locales): git reset --hard origin/$BRANCH"
    exit 1
fi
