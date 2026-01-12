#!/usr/bin/env node

/**
 * 创建声宝盒体验包
 * 30分钟，19元，精选故事
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
 * 筛选适合体验包的故事
 * 标准：
 * 1. 短小精悍（100-400字）
 * 2. 主题积极向上
 * 3. 内容完整有趣
 * 4. 适合快速体验
 */
function selectTrialStories() {
  const trialStories = [];
  const seenIds = new Set();

  // 体验包关键词（选择温馨、有趣、教育性的故事）
  const keywords = [
    '快乐', '开心', '友谊', '帮助', '分享', '勇敢', '聪明', '梦想', '爱',
    '小兔子', '小熊', '小猴', '小猫', '小狗', '小老鼠', '小松鼠',
    '月亮', '星星', '太阳', '森林', '朋友', '妈妈', '爸爸',
    '学会', '知道', '明白', '发现', '找到'
  ];

  // 排除关键词（避免不合适的内容）
  const excludeKeywords = [
    '杀', '死', '血', '暴力', '鬼', '怪物', '可怕', '恐怖'
  ];

  stories.forEach(story => {
    if (!story.content) return;

    const wordCount = getWordCount(story.content);
    const duration = estimateDuration(wordCount);

    // 字数限制：100-400字
    if (wordCount < 100 || wordCount > 400) return;

    // 检查是否已添加
    if (seenIds.has(story.cid)) return;

    const content = story.content.toLowerCase();
    const name = story.name.toLowerCase();

    // 检查排除关键词
    const hasExcluded = excludeKeywords.some(kw => content.includes(kw) || name.includes(kw));
    if (hasExcluded) return;

    // 计算匹配分数
    let score = 0;
    keywords.forEach(kw => {
      if (name.includes(kw)) score += 5;
      const regex = new RegExp(kw, 'gi');
      const matches = content.match(regex);
      if (matches) score += matches.length;
    });

    // 选择高分故事
    if (score >= 3) {
      trialStories.push({
        cid: story.cid,
        name: story.name,
        content: story.content,
        word_count: wordCount,
        estimated_duration: duration,
        score: score,
        path: story.path
      });
      seenIds.add(story.cid);
    }
  });

  // 按分数排序
  trialStories.sort((a, b) => b.score - a.score);

  return trialStories;
}

/**
 * 选择30分钟的故事组合
 */
function createTrialPackage() {
  console.log('🔍 正在筛选适合体验包的故事...\n');

  const allTrialStories = selectTrialStories();
  console.log(`✅ 找到 ${allTrialStories.length} 个适合的故事候选\n`);

  // 选择故事使总时长接近30分钟
  const selectedStories = [];
  let totalDuration = 0;
  const targetDuration = 30;

  for (const story of allTrialStories) {
    if (totalDuration + story.estimated_duration <= targetDuration + 5) {
      selectedStories.push(story);
      totalDuration += story.estimated_duration;
    }
    if (totalDuration >= targetDuration) break;
  }

  // 创建体验包数据
  const packageData = {
    package_name: '声宝盒体验包',
    package_id: 'trial',
    age_group: '3-12岁',
    total_duration: totalDuration,
    story_count: selectedStories.length,
    target_duration: 30,
    price: 19,
    description: '精选短篇故事，快速体验AI定制语音的魅力',
    features: [
      '30分钟精选内容',
      '短小精悍的故事',
      '快速体验AI语音',
      '适合初次尝试'
    ],
    stories: selectedStories.map(s => ({
      cid: s.cid,
      name: s.name,
      content: s.content,
      word_count: s.word_count,
      estimated_duration: s.estimated_duration
    }))
  };

  return packageData;
}

/**
 * 生成体验包文件
 */
function generateTrialPackage() {
  console.log('📦 正在生成体验包...\n');

  const trialPackage = createTrialPackage();

  // 创建目录
  const dir = './story-packages';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // 保存JSON文件
  const filename = `${dir}/trial.json`;
  fs.writeFileSync(filename, JSON.stringify(trialPackage, null, 2), 'utf8');

  console.log('✅ 声宝盒体验包生成完成！\n');
  console.log('📦 包信息:');
  console.log(`   包名: ${trialPackage.package_name}`);
  console.log(`   故事数: ${trialPackage.story_count}个`);
  console.log(`   总时长: ${trialPackage.total_duration}分钟`);
  console.log(`   价格: ¥${trialPackage.price}`);
  console.log(`   文件: ${filename}\n`);

  console.log('📝 故事列表:');
  trialPackage.stories.forEach((story, index) => {
    console.log(`   ${index + 1}. ${story.name} (${story.word_count}字, ${story.estimated_duration}分钟)`);
  });
  console.log('');

  // 生成README
  const readme = `# 声宝盒体验包

## 🎁 包信息

- **包名**: 声宝盒体验包
- **价格**: ¥19
- **时长**: ${trialPackage.total_duration}分钟
- **故事数**: ${trialPackage.story_count}个
- **适合年龄**: 3-12岁

## ✨ 特点

${trialPackage.features.map(f => `- ${f}`).join('\n')}

## 📚 故事列表

${trialPackage.stories.map((s, i) => `${i + 1}. **${s.name}** (${s.word_count}字, ${s.estimated_duration}分钟)`).join('\n')}

## 🎯 适用场景

- 第一次尝试声宝盒产品
- 了解AI定制语音的效果
- 短途旅行、等待时间等场景
- 送礼体验

## 📝 使用说明

1. 下单后录制10秒声音样本
2. AI将根据你的声音生成${trialPackage.story_count}个故事
3. 约30分钟音频内容
4. 支持在线播放或下载

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

  fs.writeFileSync(`${dir}/TRIAL_README.md`, readme, 'utf8');
  console.log('📄 说明文档已生成: story-packages/TRIAL_README.md\n');

  return trialPackage;
}

// 执行
try {
  const trialPackage = generateTrialPackage();

  console.log('✨ 体验包创建完成！\n');
  console.log('下一步:');
  console.log('1. 更新网站产品配置，添加体验包');
  console.log('2. 生成1-2个示例音频用于展示');
  console.log('3. 在网站上突出显示"19元体验"优惠');

} catch (error) {
  console.error('❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
}
