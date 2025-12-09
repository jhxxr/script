#!/bin/bash
# author: 星染
# date: 2024-02-05
# 检测包管理器并更新系统
if command -v apt-get >/dev/null; then
    PACKAGE_MANAGER="apt-get"
    sudo $PACKAGE_MANAGER update -y
elif command -v yum >/dev/null; then
    PACKAGE_MANAGER="yum"
    sudo $PACKAGE_MANAGER update -y
else
    echo "未找到支持的包管理器。脚本仅支持 apt-get 和 yum。"
    exit 1
fi

# 安装 Docker
if ! command -v docker >/dev/null; then
    echo "Docker 未安装，正在安装..."
    wget -qO- get.docker.com | bash
    echo "Docker 已安装，版本为："
    docker -v
    sudo systemctl enable docker
    sudo systemctl start docker
else
    echo "Docker 已安装，版本为："
    docker -v
fi

# 安装 Docker Compose
if ! command -v docker-compose >/dev/null; then
    echo "Docker Compose 未安装，正在安装..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose 已安装，版本为："
    docker-compose --version
else
    echo "Docker Compose 已安装，版本为："
    docker-compose --version
fi

echo "Docker 和 Docker Compose 安装完成。"
