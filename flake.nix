{
  description = "WhatsApp Bot - Sistema de Reservas de Barbería";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        nodejs = pkgs.nodejs_20;
        
        # Chromium para puppeteer/whatsapp-web.js
        chromium = pkgs.chromium;

        # Script wrapper que ejecuta la aplicación
        # El código fuente viene del flake, los archivos de config del directorio de trabajo
        whatsapp-bot = pkgs.writeShellApplication {
          name = "whatsapp-bot";
          runtimeInputs = [ 
            nodejs 
            pkgs.nodePackages.npm
            chromium
            # Dependencias del sistema que Chromium necesita
            pkgs.nss
            pkgs.nspr
            pkgs.atk
            pkgs.at-spi2-atk
            pkgs.cups
            pkgs.dbus
            pkgs.gtk3
            pkgs.glib
            pkgs.gdk-pixbuf
            pkgs.pango
            pkgs.cairo
            pkgs.fontconfig
            pkgs.freetype
            pkgs.xorg.libX11
            pkgs.xorg.libXcomposite
            pkgs.xorg.libXdamage
            pkgs.xorg.libXext
            pkgs.xorg.libXfixes
            pkgs.xorg.libXrandr
            pkgs.xorg.libXrender
            pkgs.xorg.libXtst
            pkgs.xorg.libXi
            pkgs.xorg.libXScrnSaver
            pkgs.xorg.libxcb
            pkgs.xorg.libXcursor
            pkgs.xorg.libXxf86vm
            pkgs.alsa-lib
            pkgs.libdrm
            pkgs.mesa
            pkgs.coreutils
          ];
          text = ''
            set -e
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🚀 WhatsApp Bot - Iniciando..."
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            # Configurar Chromium para puppeteer
            export PUPPETEER_EXECUTABLE_PATH="${chromium}/bin/chromium"
            export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
            
            # Directorio de trabajo (donde están los archivos de configuración)
            WORK_DIR="$PWD"
            echo "📂 Directorio de trabajo: $WORK_DIR"
            
            # Buscar el código fuente: primero en el directorio actual, luego hacia arriba
            if [ -f "package.json" ] && [ -d "src" ]; then
              # Si estamos en el directorio del proyecto, usarlo directamente
              PROJECT_DIR="$WORK_DIR"
              echo "✅ Encontrado package.json en: $PROJECT_DIR"
            else
              # Buscar hacia arriba
              PROJECT_DIR="$WORK_DIR"
              while [ ! -f "$PROJECT_DIR/package.json" ] && [ "$PROJECT_DIR" != "/" ]; do
                PROJECT_DIR="$(dirname "$PROJECT_DIR")"
              done
              
              if [ ! -f "$PROJECT_DIR/package.json" ]; then
                echo "❌ Error: No se encontró package.json."
                echo "💡 Ejecuta desde el directorio del proyecto o un directorio que contenga package.json"
                echo "   Directorio actual: $WORK_DIR"
                exit 1
              fi
              echo "✅ Encontrado package.json en: $PROJECT_DIR"
            fi
            
            cd "$PROJECT_DIR"
            
            # Verificar que package.json existe
            if [ ! -f "package.json" ]; then
              echo "❌ Error: package.json no encontrado en $PROJECT_DIR"
              exit 1
            fi
            
            # SIEMPRE verificar e instalar dependencias
            echo "🔍 Verificando dependencias en: $PROJECT_DIR"
            echo "   node_modules existe: $([ -d "node_modules" ] && echo "Sí" || echo "No")"
            echo "   qrcode instalado: $([ -d "node_modules/qrcode" ] && echo "Sí" || echo "No")"
            
            # Si falta node_modules o qrcode, instalar/reinstalar
            if [ ! -d "node_modules" ] || [ ! -d "node_modules/qrcode" ]; then
              if [ ! -d "node_modules" ]; then
                echo "📦 node_modules no existe, instalando dependencias..."
              else
                echo "⚠️  La dependencia 'qrcode' no está instalada"
                echo "📦 Reinstalando todas las dependencias..."
                rm -rf node_modules package-lock.json
              fi
              
              npm install --legacy-peer-deps || {
                echo "❌ Error al instalar dependencias"
                echo "💡 Intentando con npm ci..."
                npm ci --legacy-peer-deps || {
                  echo "❌ Error crítico al instalar dependencias"
                  exit 1
                }
              }
            fi
            
            # Verificación final OBLIGATORIA antes de continuar
            if [ ! -d "node_modules/qrcode" ]; then
              echo "❌ ERROR CRÍTICO: 'qrcode' no está instalado"
              echo "📋 Contenido de node_modules:"
              ls -la node_modules/ 2>/dev/null | head -10 || echo "   (vacío o no existe)"
              echo "📋 package.json contiene qrcode:"
              grep -i qrcode package.json || echo "   (no encontrado en package.json)"
              exit 1
            fi
            
            echo "✅ Dependencias verificadas: qrcode está instalado"
            
            # Verificar que src/app.js existe
            if [ ! -f "src/app.js" ]; then
              echo "❌ Error: src/app.js no encontrado en $PROJECT_DIR"
              exit 1
            fi
            
            # Listar algunas dependencias para debug
            echo "📋 Verificando dependencias instaladas:"
            ls -d node_modules/qrcode node_modules/whatsapp-web.js node_modules/express 2>/dev/null | head -5 || echo "⚠️  Algunas dependencias no encontradas"
            
            # Ejecutar la aplicación
            echo ""
            echo "🚀 Iniciando WhatsApp Bot..."
            echo "   Desde: $PROJECT_DIR"
            echo "   Node: $(which node)"
            echo "   NPM: $(which npm)"
            echo ""
            node src/app.js "$@"
          '';
        };

      in
      {
        packages.default = whatsapp-bot;
        
        apps.default = flake-utils.lib.mkApp {
          drv = whatsapp-bot;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.nodePackages.npm
            chromium
            pkgs.nss
            pkgs.nspr
            pkgs.atk
            pkgs.at-spi2-atk
            pkgs.cups
            pkgs.dbus
            pkgs.gtk3
            pkgs.glib
            pkgs.gdk-pixbuf
            pkgs.pango
            pkgs.cairo
            pkgs.fontconfig
            pkgs.freetype
            pkgs.xorg.libX11
            pkgs.xorg.libXcomposite
            pkgs.xorg.libXdamage
            pkgs.xorg.libXext
            pkgs.xorg.libXfixes
            pkgs.xorg.libXrandr
            pkgs.xorg.libXrender
            pkgs.xorg.libXtst
            pkgs.xorg.libXi
            pkgs.xorg.libXScrnSaver
            pkgs.xorg.libxcb
            pkgs.xorg.libXcursor
            pkgs.xorg.libXxf86vm
            pkgs.alsa-lib
            pkgs.libdrm
            pkgs.mesa
          ];
          
          shellHook = ''
            export PUPPETEER_EXECUTABLE_PATH="${chromium}/bin/chromium"
            export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
            echo "🚀 WhatsApp Bot Development Environment"
            echo "Run 'npm install' to install dependencies"
            echo "Run 'npm start' to start the bot"
            echo "Or use 'nix run .' to run the packaged version"
          '';
        };
      }
    );
}
