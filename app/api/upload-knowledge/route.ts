import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ファイルをバッファとして読み込む
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // CSVをパース
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true
    });

    // 一時的にファイルを保存
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, file.name);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ 
      success: true,
      message: 'ファイルが正常にアップロードされました',
      recordCount: records.length
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'ファイルの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 