#!/bin/bash
cd ~/soundbox-story
echo "开始部署到Surge..."
echo "yanhui@csdn.net" | surge . soundbox-story.surge.sh
