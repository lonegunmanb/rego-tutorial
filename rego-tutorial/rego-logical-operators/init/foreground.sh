#!/bin/bash

echo "========================================="
echo "  正在为你准备实验环境..."
echo "  请稍候，预计需要 15-30 秒"
echo "========================================="

while [ ! -f /tmp/.setup-done ]; do
  sleep 2
  echo "⏳ 环境初始化中..."
done

echo ""
echo "✅ 环境准备就绪！"
echo ""
echo "已为你预装："
echo "  • conftest（Rego 策略检查工具）"
echo ""
echo "👉 进入工作目录开始实验：cd /root/workspace"
echo ""
