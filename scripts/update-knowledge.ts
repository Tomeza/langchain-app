import fs from 'fs';
import path from 'path';
import csv from 'csv-parse/sync';

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  parent_id: string;
  tags: string;
  priority: string;
  purpose: string;
  chunk_type: string;
}

async function updateKnowledge() {
  // 各カテゴリのCSVを読み込み
  const categories = [
    'reservation_rules',
    'reservation_change_rules',
    'international_ng',
    'vehicles_ng',
    'usage_process',
    'operation_rules',
    'baggage_rules',
    'capacity_rules',
    'transportation_plans_knowledge',
    'group_usage',
    'fee_rules',
    'peak_season',
    'full_parking_responses',
    'navigation_and_access',
    'other'
  ];
  let allKnowledge: KnowledgeItem[] = [];
  let currentId = 1;

  for (const category of categories) {
    const categoryDir = path.join(__dirname, `../data/knowledge/${category}`);
    if (!fs.existsSync(categoryDir)) {
      console.log(`Skipping non-existent directory: ${category}`);
      continue;
    }

    let parentId: string | undefined;

    // 基本ルールの読み込み
    const basePath = path.join(categoryDir, 'base.csv');
    if (fs.existsSync(basePath)) {
      console.log(`Processing base.csv for ${category}`);
      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseItems = csv.parse(baseContent, { columns: true }) as KnowledgeItem[];
      console.log(`Found ${baseItems.length} base items`);
      
      // 親アイテムを追加
      for (const item of baseItems) {
        parentId = currentId.toString();
        allKnowledge.push({
          ...item,
          id: parentId,
          parent_id: '',
          chunk_type: 'parent',
          tags: item.tags || category
        });
        currentId++;
      }
    }

    // 詳細ルールの読み込み
    const detailsPath = path.join(categoryDir, 'details.csv');
    if (fs.existsSync(detailsPath)) {
      console.log(`Found details.csv for ${category}`);
      if (!parentId) {
        console.warn(`Warning: Found details.csv but no parent ID for ${category}`);
        continue;
      }
      
      console.log(`Processing details.csv for ${category}`);
      try {
        const detailsContent = fs.readFileSync(detailsPath, 'utf-8');
        const detailItems = csv.parse(detailsContent, { columns: true }) as KnowledgeItem[];
        console.log(`Found ${detailItems.length} detail items in ${category}/details.csv`);
        
        if (detailItems.length === 0) {
          console.warn(`Warning: Empty details.csv for ${category}`);
          continue;
        }

        // 子アイテムを追加
        for (const detailItem of detailItems) {
          allKnowledge.push({
            ...detailItem,
            id: currentId.toString(),
            parent_id: parentId,
            chunk_type: 'child',
            // カテゴリをタグの先頭に追加（既存のタグは維持）
            tags: detailItem.tags.startsWith(category) ? detailItem.tags : `${category},${detailItem.tags}`
          });
          currentId++;
        }
      } catch (error) {
        console.error(`Error processing details.csv for ${category}:`, error);
      }
    } else {
      console.log(`No details.csv found for ${category}`);
    }
  }

  console.log(`Total items processed: ${allKnowledge.length}`);
  
  // 統合したナレッジをknowledge.csvに書き出し
  const outputPath = path.join(__dirname, '../data/knowledge.csv');
  const header = 'id,question,answer,parent_id,tags,priority,purpose,chunk_type\n';
  const content = allKnowledge.map(item => 
    `${item.id},"${item.question.replace(/"/g, '""')}","${item.answer.replace(/"/g, '""')}","${item.parent_id}","${item.tags}","${item.priority}","${item.purpose}","${item.chunk_type}"`
  ).join('\n');

  fs.writeFileSync(outputPath, header + content);
  console.log('Knowledge base updated successfully');
}

async function backupExistingKnowledge() {
  const knowledgePath = path.join(__dirname, '../data/knowledge.csv');
  if (fs.existsSync(knowledgePath)) {
    // バックアップを作成
    fs.copyFileSync(knowledgePath, knowledgePath + '.bak');
    
    // 既存のデータを読み込み
    const content = fs.readFileSync(knowledgePath, 'utf-8');
    const items = csv.parse(content, { columns: true }) as KnowledgeItem[];
    
    // 定義済みカテゴリ
    const validCategories = [
      'reservation_rules',
      'reservation_change_rules',
      'international_ng',
      'vehicles_ng',
      'usage_process',
      'operation_rules',
      'baggage_rules',
      'capacity_rules',
      'transportation_plans_knowledge',
      'group_usage',
      'fee_rules',
      'peak_season',
      'full_parking_responses',
      'navigation_and_access',
      'other'
    ];
    
    // カテゴリごとに分類
    const categories = new Map<string, { base: KnowledgeItem[], details: KnowledgeItem[] }>();
    const processedIds = new Set<string>();

    // まず親アイテムを処理
    items.forEach((item: KnowledgeItem) => {
      if (item.chunk_type === 'parent') {
        const foundCategory = item.tags.split(',')
          .map(tag => tag.trim())
          .find(tag => validCategories.includes(tag));
        
        const category = foundCategory || 'other';
        
        if (!categories.has(category)) {
          categories.set(category, { base: [], details: [] });
        }
        
        categories.get(category)?.base.push(item);
        processedIds.add(item.id);
      }
    });

    // 次に子アイテムを処理
    items.forEach((item: KnowledgeItem) => {
      if (item.chunk_type === 'child' && !processedIds.has(item.id)) {
        // 親IDから対応するカテゴリを見つける
        const parentItem = items.find(i => i.id === item.parent_id);
        if (parentItem) {
          // 親アイテムのタグからカテゴリを見つける
          const foundCategory = parentItem.tags.split(',')
            .map(tag => tag.trim())
            .find(tag => validCategories.includes(tag));
          
          const category = foundCategory || 'other';
          
          if (!categories.has(category)) {
            categories.set(category, { base: [], details: [] });
          }
          
          // デバッグログを追加
          console.log(`Adding child item to ${category}, parent_id: ${item.parent_id}`);
          
          categories.get(category)?.details.push({
            ...item,
            tags: item.tags || category // タグが空の場合はカテゴリを使用
          });
          processedIds.add(item.id);
        } else {
          console.warn(`Warning: No parent found for child item ${item.id}`);
        }
      }
    });
    
    // カテゴリごとにファイルを作成
    Array.from(categories.entries()).forEach(([category, data]) => {
      const categoryDir = path.join(__dirname, `../data/knowledge/${category}`);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
      
      // base.csvの作成（既存ファイルは上書き）
      if (data.base.length > 0) {
        const basePath = path.join(categoryDir, 'base.csv');
        const baseContent = convertToCSV(data.base);
        fs.writeFileSync(basePath, baseContent);
      }
      
      // details.csvの作成（既存ファイルは上書き）
      if (data.details.length > 0) {
        const detailsPath = path.join(categoryDir, 'details.csv');
        console.log(`Writing ${data.details.length} items to ${category}/details.csv`);
        const detailsContent = convertToCSV(data.details);
        fs.writeFileSync(detailsPath, detailsContent);
      } else {
        console.log(`No details to write for ${category}`);
      }
    });
  }
}

// CSVフォーマットに変換するヘルパー関数
function convertToCSV(items: KnowledgeItem[]) {
  const header = 'question,answer,tags,priority,purpose\n';
  const content = items.map(item => {
    // デバッグログを追加
    console.log('Converting item:', {
      id: item.id,
      question: item.question?.substring(0, 30) + '...',
      tags: item.tags
    });
    
    return `"${item.question}","${item.answer}","${item.tags}","${item.priority}","${item.purpose}"`;
  }).join('\n');
  return header + content;
}

// メイン処理
export async function update() {
  try {
    // まずバックアップと分割を実行
    await backupExistingKnowledge();
    
    // バックアップから復元
    const backupDir = path.join(__dirname, '../data/knowledge_backup');
    const knowledgeDir = path.join(__dirname, '../data/knowledge');
    
    if (fs.existsSync(backupDir)) {
      // 既存のknowledgeディレクトリを削除
      if (fs.existsSync(knowledgeDir)) {
        fs.rmSync(knowledgeDir, { recursive: true });
      }
      
      // バックアップからコピー
      fs.cpSync(backupDir, knowledgeDir, { recursive: true });
    }
    
    // 次に更新を実行
    await updateKnowledge();
  } catch (error) {
    console.error('Error during update:', error);
    throw error;
  }
}

update(); 