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
        # Busca el directorio del proyecto y ejecuta desde ahí
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
          ];
          text = ''
            set -e
            
            # Configurar Chromium para puppeteer
            export PUPPETEER_EXECUTABLE_PATH="${chromium}/bin/chromium"
            export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
            
            # Buscar el directorio del proyecto (donde está package.json)
            PROJECT_DIR="$PWD"
            while [ ! -f "$PROJECT_DIR/package.json" ] && [ "$PROJECT_DIR" != "/" ]; do
              PROJECT_DIR="$(dirname "$PROJECT_DIR")"
            done
            
            if [ ! -f "$PROJECT_DIR/package.json" ]; then
              echo "❌ Error: No se encontró package.json. Ejecuta desde el directorio del proyecto."
              exit 1
            fi
            
            cd "$PROJECT_DIR"
            
            # Si no existe node_modules, instalar dependencias
            if [ ! -d "node_modules" ]; then
              echo "📦 Instalando dependencias de npm..."
              npm install --legacy-peer-deps
            fi
            
            # Ejecutar la aplicación (equivalente a npm start)
            echo "🚀 Iniciando WhatsApp Bot..."
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
