#!/usr/bin/env node

/**
 * 按年龄段生成故事包
 * 1-3岁、4-6岁、6-11岁，每个包120分钟
 */

const fs = require('fs');

// 读取故事数据
console.log('📖 正在读取故事数据...');
const storyData = require('./story.json');
const stories = storyData.RECORDS;

console.log(`✅ 共读取 ${stories.length} 个故事\n`);

/**
 * 计算故事字数
 */
function getWordCount(content) {
  if (!content) return 0;
  return content.replace(/\s/g, '').length;
}

/**
 * 估算故事时长（分钟）
 */
function estimateDuration(wordCount) {
  return Math.ceil(wordCount / 150);
}

/**
 * 年龄段配置
 */
const ageGroups = {
  '1-3岁': {
    keywords: ['小兔子', '小熊', '小猫', '小狗', '宝宝', '妈妈', '爸爸',
               '吃饭', '睡觉', '洗澡', '穿衣', '玩具', '朋友', '玩', '开心',
               '简单', '容易', '学习', '认识', '颜色', '形状', '数数'],
    preferredLength: [100, 300],
    maxLength: 400,
    description: '适合幼儿，语言简单，情节重复，主题围绕日常生活'
  },
  '4-6岁': {
    keywords: ['冒险', '发现', '探索', '帮助', '友谊', '勇敢', '聪明',
               '学校', '学习', '朋友', '分享', '合作', '解决问题',
               '小猪', '小猴', '小老鼠', '森林', '城堡', '公主', '王子'],
    preferredLength: [300, 600],
    description: '适合学龄前儿童，情节丰富，有想象力，教育意义'
  },
  '6-11岁': {
    keywords: ['神话', '传说', '英雄', '冒险', '挑战', '成长', '智慧',
               '历史', '科学', '探索', '发现', '发明', '创造',
               '盘古', '女娲', '嫦娥', '孙悟空', '三国', '水浒'],
    preferredLength: [500, 1200],
    minLength: 400,
    description: '适合学龄儿童，情节复杂，有深度，启发性强'
  }
};

/**
 * 计算故事匹配分数
 */
function calculateScore(story, ageGroup) {
  const config = ageGroups[ageGroup];
  const content = (story.content || '').toLowerCase();
  const name = (story.name || '').toLowerCase();
  let score = 0;
  let matchedKeywords = [];

  // 标题匹配（权重更高）
  config.keywords.forEach(keyword => {
    if (name.includes(keyword)) {
      score += 10;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  });

  // 内容匹配
  config.keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex);
    if (matches) {
      score += matches.length;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  });

  // 字数适配度
  const wordCount = getWordCount(story.content);
  const [minPref, maxPref] = config.preferredLength;

  if (wordCount >= minPref && wordCount <= maxPref) {
    score += 5;
  } else if (config.minLength && wordCount < config.minLength) {
    score -= 10;
  } else if (config.maxLength && wordCount > config.maxLength) {
    score -= 10;
  }

  return { score, matchedKeywords, wordCount };
}

/**
 * 为年龄段选择故事
 */
function selectStoriesForAge(ageGroup) {
  console.log(`\n🔍 正在为 ${ageGroup} 筛选故事...`);

  const config = ageGroups[ageGroup];
  const candidates = [];

  stories.forEach(story => {
    if (!story.content) return;

    const result = calculateScore(story, ageGroup);

    // 只选择有一定匹配度的故事
    if (result.score > 0) {
      candidates.push({
        cid: story.cid,
        name: story.name,
        content: story.content,
        word_count: result.wordCount,
        estimated_duration: estimateDuration(result.wordCount),
        score: result.score,
        matched_keywords: result.matchedKeywords,
        path: story.path
      });
    }
  });

  // 按分数排序
  candidates.sort((a, b) => b.score - a.score);

  console.log(`   找到 ${candidates.length} 个候选故事`);

  // 选择故事使总时长接近120分钟
  const selected = [];
  let totalDuration = 0;
  const targetDuration = 120;

  for (const story of candidates) {
    if (totalDuration + story.estimated_duration <= targetDuration + 10) {
      selected.push(story);
      totalDuration += story.estimated_duration;
    }
    if (totalDuration >= targetDuration) break;
  }

  console.log(`   选择了 ${selected.length} 个故事，总时长 ${totalDuration}分钟\n`);

  return selected;
}

/**
 * 生成所有年龄段的故事包
 */
function generateAgePackages() {
  console.log('📦 开始生成年龄段故事包...\n');

  const dir = './story-packages';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const results = {};

  Object.keys(ageGroups).forEach(ageGroup => {
    const stories = selectStoriesForAge(ageGroup);
    const totalDuration = stories.reduce((sum, s) => sum + s.estimated_duration, 0);

    const packageData = {
      package_name: `${ageGroup}故事包`,
      package_id: ageGroup.replace('-', '').replace('岁', ''),
      age_group: ageGroup,
      total_duration: totalDuration,
      story_count: stories.length,
      target_duration: 120,
      price: 79,
      description: ageGroups[ageGroup].description,
      stories: stories.map(s => ({
        cid: s.cid,
        name: s.name,
        content: s.content,
        word_count: s.word_count,
        estimated_duration: s.estimated_duration,
        tags: s.matched_keywords
      }))
    };

    // 保存文件
    const filename = `${dir}/${ageGroup}.json`;
    fs.writeFileSync(filename, JSON.stringify(packageData, null, 2), 'utf8');

    console.log(`✅ ${ageGroup}故事包:`);
    console.log(`   故事数: ${stories.length}`);
    console.log(`   总时长: ${totalDuration}分钟`);
    console.log(`   文件: ${filename}\n`);

    results[ageGroup] = packageData;
  });

  return results;
}

/**
 * 生成总结报告
 */
function generateReport(packages) {
  const report = `# 年龄段故事包报告

## 📊 包信息

| 年龄段 | 故事数 | 总时长 | 价格 | 特点 |
|--------|--------|--------|------|------|
${Object.keys(packages).map(age => {
  const pkg = packages[age];
  return `| ${age} | ${pkg.story_count}个 | ${pkg.total_duration}分钟 | ¥${pkg.price} | ${pkg.description} |`;
}).join('\n')}

## 📝 示例故事

### 1-3岁
${packages['1-3岁'].stories.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字)`).join('\n')}

### 4-6岁
${packages['4-6岁'].stories.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字)`).join('\n')}

### 6-11岁
${packages['6-11岁'].stories.slice(0, 5).map(s => `- ${s.name} (${s.word_count}字)`).join('\n')}

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

  fs.writeFileSync('./story-packages/AGE_PACKAGES_REPORT.md', report, 'utf8');
  console.log('📄 报告已生成: story-packages/AGE_PACKAGES_REPORT.md\n');
}

// 执行
try {
  const packages = generateAgePackages();
  generateReport(packages);

  console.log('✨ 年龄段故事包生成完成！\n');
  console.log('📁 生成的文件:');
  console.log('- story-packages/1-3岁.json');
  console.log('- story-packages/4-6岁.json');
  console.log('- story-packages/6-11岁.json');
  console.log('- story-packages/AGE_PACKAGES_REPORT.md');

} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}
