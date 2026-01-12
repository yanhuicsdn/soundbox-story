#!/usr/bin/env node

/**
 * 故事分析和分类脚本
 * 从story.json中筛选并分类故事到三个产品包
 */

const fs = require('fs');

// 读取故事数据
console.log('📖 正在读取故事数据...');
const storyData = require('./story.json');
const stories = storyData.RECORDS;

console.log(`✅ 共读取 ${stories.length} 个故事\n`);

// 关键词配置
const keywords = {
  sleep: {
    name: '哄睡故事包',
    keywords: ['梦', '睡觉', '夜晚', '月亮', '星星', '安静', '温柔', '休息', '床', '摇篮', '宁静', '睡眠', '睡前', '晚安', '梦境', '睡梦', '沉睡', '午睡', '懒洋洋', '困', '甜', '柔和', '轻柔'],
    excludeKeywords: ['怕', '鬼', '怪物', '可怕', '恐怖', '打', '杀', '死', '血', '哭', '叫', '惊'],
    maxLength: 600, // 字数限制，适合睡前听的简短故事
    preferredLength: [200, 500]
  },
  brave: {
    name: '勇敢成长包',
    keywords: ['勇敢', '勇气', '冒险', '挑战', '克服', '战胜', '英雄', '坚强', '不怕', '努力', '奋斗', '成长', '成功', '胜利', '战胜困难', '探索', '发现', '英雄', '勇士', '斗', '战胜', '击败', '保护', '拯救'],
    excludeKeywords: [],
    minLength: 200,
    preferredLength: [300, 800]
  },
  emotion: {
    name: '情绪管理包',
    keywords: ['开心', '快乐', '高兴', '友谊', '朋友', '分享', '帮助', '爱', '喜欢', '善良', '友好', '礼貌', '诚实', '信任', '原谅', '道歉', '感谢', '关心', '同情', '理解', '合作', '团结', '温和', '耐心', '生气', '愤怒', '伤心', '难过', '害怕', '担心', '焦虑', '情绪', '心情'],
    excludeKeywords: ['杀', '死', '血', '暴力'],
    preferredLength: [250, 700]
  }
};

/**
 * 计算故事字数
 */
function getWordCount(content) {
  if (!content) return 0;
  return content.replace(/\s/g, '').length;
}

/**
 * 计算故事匹配分数
 */
function calculateScore(story, category) {
  const config = keywords[category];
  const content = (story.content || '').toLowerCase();
  const name = (story.name || '').toLowerCase();
  let score = 0;
  let matchedKeywords = [];

  // 检查标题匹配（权重更高）
  config.keywords.forEach(keyword => {
    if (name.includes(keyword)) {
      score += 10; // 标题匹配给高分
      matchedKeywords.push(keyword);
    }
  });

  // 检查内容匹配
  config.keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex);
    if (matches) {
      score += matches.length * 2; // 每次出现加2分
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  });

  // 检查排除关键词
  config.excludeKeywords.forEach(keyword => {
    if (content.includes(keyword) || name.includes(keyword)) {
      score -= 50; // 排除关键词大幅扣分
    }
  });

  // 字数适配度评分
  const wordCount = getWordCount(content);
  const [minPref, maxPref] = config.preferredLength;

  if (wordCount >= minPref && wordCount <= maxPref) {
    score += 5; // 在理想长度范围内加分
  } else if (config.minLength && wordCount < config.minLength) {
    score -= 10; // 太短扣分
  } else if (config.maxLength && wordCount > config.maxLength) {
    score -= 10; // 太长扣分
  }

  return { score, matchedKeywords, wordCount };
}

/**
 * 估算故事时长（分钟）
 */
function estimateDuration(wordCount) {
  // 假设每分钟150字（正常语速）
  return Math.ceil(wordCount / 150);
}

/**
 * 分类故事
 */
function classifyStories() {
  console.log('🔍 开始分析并分类故事...\n');

  const results = {
    sleep: [],
    brave: [],
    emotion: []
  };

  // 为每个故事计算分数
  stories.forEach(story => {
    // 过滤掉没有内容的故事
    if (!story.content) return;

    const wordCount = getWordCount(story.content);

    // 过滤掉过短或内容不完整的故事
    if (wordCount < 100) return;

    const sleepResult = calculateScore(story, 'sleep');
    const braveResult = calculateScore(story, 'brave');
    const emotionResult = calculateScore(story, 'emotion');

    // 将故事添加到最匹配的类别
    const scores = {
      sleep: sleepResult.score,
      brave: braveResult.score,
      emotion: emotionResult.score
    };

    // 找出最高分的类别
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore <= 0) return; // 所有分数都为0，跳过

    const bestCategory = Object.keys(scores).find(key => scores[key] === maxScore);

    results[bestCategory].push({
      cid: story.cid,
      name: story.name,
      content: story.content,
      word_count: wordCount,
      estimated_duration: estimateDuration(wordCount),
      score: maxScore,
      matched_keywords: bestCategory === 'sleep' ? sleepResult.matchedKeywords :
                       bestCategory === 'brave' ? braveResult.matchedKeywords :
                       emotionResult.matchedKeywords,
      path: story.path
    });
  });

  // 按分数排序并选择前40个故事
  Object.keys(results).forEach(category => {
    results[category].sort((a, b) => b.score - a.score);
    results[category] = results[category].slice(0, 40);
  });

  return results;
}

/**
 * 生成故事包JSON文件
 */
function generateStoryPackages(classifiedStories) {
  console.log('📦 生成故事包文件...\n');

  const categories = ['sleep', 'brave', 'emotion'];
  const categoryNames = {
    sleep: '哄睡故事包',
    brave: '勇敢成长包',
    emotion: '情绪管理包'
  };

  // 创建story-packages目录
  const dir = './story-packages';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  categories.forEach(category => {
    let stories = classifiedStories[category];
    let totalDuration = stories.reduce((sum, s) => sum + s.estimated_duration, 0);

    // 如果总时长超过130分钟，筛选故事使其接近120分钟
    if (totalDuration > 130) {
      console.log(`⚠️  ${categoryNames[category]} 原始时长 ${totalDuration}分钟，正在优化...`);

      // 按照匹配分数排序，选择前N个故事使总时长接近120分钟
      let targetDuration = 120;
      let selectedStories = [];
      let currentDuration = 0;

      for (const story of stories) {
        if (currentDuration + story.estimated_duration <= targetDuration + 10) {
          selectedStories.push(story);
          currentDuration += story.estimated_duration;
        }
        if (currentDuration >= targetDuration) break;
      }

      stories = selectedStories;
      totalDuration = currentDuration;
    }

    const packageData = {
      package_name: categoryNames[category],
      package_id: category,
      age_group: '3-12岁',
      total_duration: totalDuration,
      story_count: stories.length,
      target_duration: 120, // 目标120分钟
      stories: stories.map(s => ({
        cid: s.cid,
        name: s.name,
        content: s.content,
        word_count: s.word_count,
        estimated_duration: s.estimated_duration,
        tags: s.matched_keywords
      }))
    };

    const filename = `${dir}/${category}.json`;
    fs.writeFileSync(filename, JSON.stringify(packageData, null, 2), 'utf8');

    console.log(`✅ ${categoryNames[category]}:`);
    console.log(`   故事数: ${stories.length}`);
    console.log(`   总时长: ${totalDuration}分钟`);
    console.log(`   文件: ${filename}\n`);
  });
}

/**
 * 生成分析报告
 */
function generateReport(classifiedStories) {
  const report = `# 声宝盒故事包分析报告

## 📊 总体统计

- **总故事数**: ${stories.length}
- **分类时间**: ${new Date().toLocaleString('zh-CN')}

## 📦 三个故事包

### 1. 哄睡故事包 (sleep)

**目标**: 帮助孩子安静入睡
- 故事数量: ${classifiedStories.sleep.length}个
- 总时长: ${classifiedStories.sleep.reduce((sum, s) => sum + s.estimated_duration, 0)}分钟
- 特点: 温柔、安静、情节舒缓

**主题关键词**: 梦、夜晚、月亮、星星、安静、休息

**示例故事**:
${classifiedStories.sleep.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字, ${s.estimated_duration}分钟)`).join('\n')}

---

### 2. 勇敢成长包 (brave)

**目标**: 培养孩子勇气和探索精神
- 故事数量: ${classifiedStories.brave.length}个
- 总时长: ${classifiedStories.brave.reduce((sum, s) => sum + s.estimated_duration, 0)}分钟
- 特点: 冒险、挑战、成长、克服困难

**主题关键词**: 勇敢、冒险、挑战、克服、英雄、成长

**示例故事**:
${classifiedStories.brave.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字, ${s.estimated_duration}分钟)`).join('\n')}

---

### 3. 情绪管理包 (emotion)

**目标**: 帮助孩子理解和管理情绪
- 故事数量: ${classifiedStories.emotion.length}个
- 总时长: ${classifiedStories.emotion.reduce((sum, s) => sum + s.estimated_duration, 0)}分钟
- 特点: 友谊、分享、善良、情绪认知

**主题关键词**: 开心、快乐、友谊、帮助、分享、爱、善良

**示例故事**:
${classifiedStories.emotion.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字, ${s.estimated_duration}分钟)`).join('\n')}

---

## 📝 使用说明

每个故事包的JSON文件包含以下信息：

\`\`\`json
{
  "package_name": "包名称",
  "package_id": "包ID",
  "age_group": "适合年龄",
  "total_duration": 总时长(分钟),
  "story_count": 故事数量,
  "stories": [
    {
      "cid": "故事ID",
      "name": "故事名称",
      "content": "故事内容",
      "word_count": 字数,
      "estimated_duration": 预计时长(分钟),
      "tags": ["匹配的关键词标签"]
    }
  ]
}
\`\`\`

## 🎯 下一步

1. 根据这些故事包训练AI模型
2. 为每个故事生成示例音频
3. 在网站上展示故事包内容
4. 用户下单后批量生成音频

---

*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

  fs.writeFileSync('./STORY_ANALYSIS.md', report, 'utf8');
  console.log('📄 分析报告已生成: STORY_ANALYSIS.md\n');
}

// 执行分类
try {
  const classifiedStories = classifyStories();
  generateStoryPackages(classifiedStories);
  generateReport(classifiedStories);

  console.log('✨ 故事分类完成！\n');
  console.log('生成的文件:');
  console.log('- story-packages/sleep.json  (哄睡故事包)');
  console.log('- story-packages/brave.json  (勇敢成长包)');
  console.log('- story-packages/emotion.json (情绪管理包)');
  console.log('- STORY_ANALYSIS.md           (分析报告)');

} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}
