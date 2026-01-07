#!/bin/bash
# -*- coding: utf-8 -*-
"""
Publicar en GitHub - Script para Linux/Mac

Usage:
    ./publish_to_github.sh --token "tu_token" --repo "nombre_repositorio"
    ./publish_to_github.sh --help

Requisitos:
    - Git instalado
    - Token de acceso personal de GitHub
"""

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de print
print_header() {
    echo -e "\n${BLUE}===============================================${NC}"
    echo -e "   $1"
    echo -e "${BLUE}===============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Parser de argumentos
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --token)
                TOKEN="$2"
                shift 2
                ;;
            --repo)
                REPO_NAME="$2"
                shift 2
                ;;
            --desc)
                DESCRIPTION="$2"
                shift 2
                ;;
            --open)
                OPEN_BROWSER=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Opción desconocida: $1"
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Publicar Gestor de Facturas en GitHub

Usage: ./publish_to_github.sh [opciones]

Opciones:
    --token TOKEN     Token de acceso personal de GitHub
    --repo REPO       Nombre del repositorio (default: gestor-facturas)
    --desc DESC       Descripción del repositorio
    --open            Abrir repositorio en el navegador al terminar
    --help, -h        Mostrar esta ayuda

Ejemplos:
    ./publish_to_github.sh --token "ghp_xxxx" --repo "mi-app"
    ./publish_to_github.sh --token "ghp_xxxx" --repo "mi-app" --open

Para crear un token:
    1. Ve a GitHub > Settings > Developer settings > Personal access tokens
    2. Genera un nuevo token con permisos 'repo'
    3. Copia el token y úsalo aquí

EOF
}

# Verificar dependencias
check_dependencies() {
    print_header "VERIFICANDO DEPENDENCIAS"
    
    # Git
    if ! command -v git &> /dev/null; then
        print_error "Git no está instalado"
        echo "Instala Git desde: https://git-scm.com/downloads"
        exit 1
    fi
    print_success "Git encontrado: $(git --version)"
    
    # jq para JSON
    if ! command -v jq &> /dev/null; then
        print_warning "jq no encontrado (se instalará si es posible)"
    fi
}

# Configurar Git
configure_git() {
    print_header "CONFIGURANDO GIT"
    
    if ! git config user.name &> /dev/null; then
        echo "Git necesita estar configurado:"
        read -p "Tu nombre de usuario: " GIT_NAME
        read -p "Tu email: " GIT_EMAIL
        
        if [[ -z "$GIT_NAME" || -z "$GIT_EMAIL" ]]; then
            print_error "Nombre y email son obligatorios"
            exit 1
        fi
        
        git config user.name "$GIT_NAME"
        git config user.email "$GIT_EMAIL"
    fi
    
    print_success "Git configurado: $(git config user.name) <$(git config user.email)>"
}

# Crear .gitignore
create_gitignore() {
    print_info "Creando .gitignore..."
    
    cat > .gitignore << 'EOF'
# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.venv
env/
venv/
ENV/

# Logs
*.log
EOF
    
    print_success ".gitignore creado"
}

# Inicializar repositorio
init_repo() {
    print_header "INICIALIZANDO REPOSITORIO"
    
    CURRENT_DIR=$(pwd)
    
    # Verificar si ya hay repositorio
    if [ -d ".git" ]; then
        print_info "Repositorio Git ya existe"
    else
        git init
        git branch -M main
        print_success "Repositorio Git inicializado"
    fi
}

# Crear repositorio en GitHub
create_github_repo() {
    print_header "CREANDO REPOSITORIO EN GITHUB"
    
    if [[ -z "$TOKEN" ]]; then
        print_warning "No se proporcionó token"
        echo "Para crear el repositorio en GitHub, proporciona un token:"
        echo "  ./publish_to_github.sh --token 'tu_token' --repo 'nombre'"
        echo ""
        echo "Crea un token en: GitHub > Settings > Developer settings > Tokens"
        echo ""
        read -p "¿Continuar solo con repositorio local? (s/n): " CONTINUE
        if [[ "$CONTINUE" != "s" && "$CONTINUE" != "S" ]]; then
            exit 0
        fi
        return 0
    fi
    
    # Verificar jq
    if ! command -v jq &> /dev/null; then
        print_error "jq es necesario para crear el repositorio"
        print_info "Instala jq: brew install jq (Mac) o apt install jq (Linux)"
        exit 1
    fi
    
    # Crear repositorio via API
    print_info "Creando repositorio..."
    
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: token $TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{\"name\":\"$REPO_NAME\",\"description\":\"$DESCRIPTION\",\"private\":false}")
    
    # Verificar respuesta
    if echo "$RESPONSE" | jq -e '.html_url' > /dev/null 2>&1; then
        REPO_URL=$(echo "$RESPONSE" | jq -r '.html_url')
        print_success "Repositorio creado: $REPO_URL"
        
        # Configurar remote
        git remote add origin "https://github.com/USUARIO/$REPO_NAME.git" 2>/dev/null || true
        
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.message // "Error desconocido"')
        print_error "No se pudo crear el repositorio: $ERROR"
        exit 1
    fi
}

# Subir archivos
push_to_github() {
    print_header "SUBIENDO ARCHIVOS A GITHUB"
    
    # Añadir archivos
    print_info "Añadiendo archivos..."
    git add .
    
    # Verificar cambios
    if git diff --cached --quiet; then
        print_info "No hay cambios para subir"
        return 0
    fi
    
    # Commit
    print_info "Haciendo commit..."
    git commit -m "Initial commit: Gestor de Facturas v1.0"
    
    # Push
    print_info "Subiendo a GitHub..."
    if git remote get-url origin &> /dev/null; then
        git push -u origin main
        print_success "Archivos subidos correctamente"
    else
        print_warning "No hay remote configurado para push"
        print_info "Configura el remote con:"
        echo "  git remote add origin https://github.com/USUARIO/$REPO_NAME.git"
        echo "  git push -u origin main"
    fi
}

# Abrir en navegador
open_browser() {
    if [[ "$OPEN_BROWSER" == true && -n "$REPO_URL" ]]; then
        print_info "Abriendo repositorio en el navegador..."
        if command -v xdg-open &> /dev/null; then
            xdg-open "$REPO_URL"
        elif command -v open &> /dev/null; then
            open "$REPO_URL"
        else
            print_info "Abre manualmente: $REPO_URL"
        fi
    fi
}

# Mostrar resumen
show_summary() {
    print_header "PROCESO COMPLETADO"
    
    if [[ -n "$REPO_URL" ]]; then
        print_info "Repositorio: $REPO_URL"
    fi
    print_success "Archivos guardados localmente"
    
    echo ""
    echo "Próximos pasos:"
    echo "  1. Revisa tu repositorio en GitHub"
    echo "  2. Añade una descripción y etiquetas"
    echo "  3. Comparte tu proyecto!"
    echo ""
}

# Función principal
main() {
    # Valores por defecto
    TOKEN=""
    REPO_NAME="gestor-facturas"
    DESCRIPTION="Aplicación de gestión de facturas con cálculo automático de IVA"
    OPEN_BROWSER=false
    
    parse_args "$@"
    
    # Verificar directorio
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Ejecutar funciones
    check_dependencies
    configure_git
    create_gitignore
    init_repo
    create_github_repo
    push_to_github
    open_browser
    show_summary
}

# Ejecutar
main "$@"
