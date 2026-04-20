@echo off
REM ===========================================
REM ComfyUI 集成系统 - 一键部署脚本
REM Storyboard Copilot x ComfyUI
REM ===========================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "COMFYUI_PORT=8188"
set "COMFYUI_URL=http://127.0.0.1:%COMFYUI_PORT%"
set "LOG_FILE=%SCRIPT_DIR%deploy.log"

echo ========================================== >> "%LOG_FILE%"
echo [%date% %time%] 部署开始 >> "%LOG_FILE%"

echo.
echo ===========================================
echo   ComfyUI 集成系统 - 部署工具
echo ===========================================
echo.

REM 检查 Node.js
echo [1/5] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo 参考: https://nodejs.org/
    exit /b 1
)
node --version
echo [OK] Node.js 检查通过

REM 检查 Rust/Cargo (用于 Tauri)
echo.
echo [2/5] 检查 Rust 环境...
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 Rust，Tauri 构建将不可用
    echo 参考: https://rustup.rs/
) else (
    cargo --version
    echo [OK] Rust 检查通过
)

REM 安装前端依赖
echo.
echo [3/5] 安装前端依赖...
cd /d "%PROJECT_DIR%"
if not exist "node_modules" (
    echo 安装依赖包...
    call npm install >> "%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        exit /b 1
    )
) else (
    echo 依赖已存在，跳过
)
echo [OK] 前端依赖就绪

REM 检查 ComfyUI 连接
echo.
echo [4/5] 检查 ComfyUI 连接...
powershell -Command "Invoke-WebRequest -Uri '%COMFYUI_URL%/system_stats' -UseBasicParsing -TimeoutSec 3" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] ComfyUI 已运行: %COMFYUI_URL%
) else (
    echo [警告] ComfyUI 未运行
    echo.
    echo 请确保 ComfyUI 已安装并运行在 %COMFYUI_URL%
    echo.
    echo 安装 ComfyUI:
    echo   1. 克隆仓库: git clone https://github.com/comfyanonymous/ComfyUI.git
    echo   2. 进入目录: cd ComfyUI
    echo   3. 安装依赖: pip install -r requirements.txt
    echo   4. 运行: python main.py --listen 127.0.0.1 --port %COMFYUI_PORT%
    echo.
)

REM 构建前端
echo.
echo [5/5] 构建前端...
call npm run build >> "%LOG_FILE%" 2>&1
if %errorlevel% equ 0 (
    echo [OK] 前端构建成功
) else (
    echo [错误] 前端构建失败
    exit /b 1
)

echo.
echo ===========================================
echo   部署完成!
echo ===========================================
echo.
echo 可用命令:
echo   npm run dev          - 开发模式
echo   npm run tauri dev    - Tauri 开发模式
echo   npm run build        - 生产构建
echo.
echo ComfyUI 地址: %COMFYUI_URL%
echo.

echo [%date% %time%] 部署完成 >> "%LOG_FILE%"
exit /b 0
