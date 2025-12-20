import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const publicDir = path.join(distDir, 'public');

async function postBuild() {
  try {
    // 检查 public 目录是否存在
    if (await fs.pathExists(publicDir)) {
      // 移动 public 目录下的所有文件到 dist 根目录
      const files = await fs.readdir(publicDir);
      
      for (const file of files) {
        const srcPath = path.join(publicDir, file);
        const destPath = path.join(distDir, file);
        
        // 如果是 HTML 文件，需要修正资源路径
        if (file.endsWith('.html')) {
          let content = await fs.readFile(srcPath, 'utf-8');
          // 将 ../assets/ 替换为 ./assets/
          content = content.replace(/\.\.\/assets\//g, './assets/');
          await fs.writeFile(destPath, content);
          console.log(`✓ 移动并修正文件: ${file}`);
        } else {
          await fs.move(srcPath, destPath, { overwrite: true });
          console.log(`✓ 移动文件: ${file}`);
        }
      }
      
      // 删除空的 public 目录
      await fs.remove(publicDir);
      console.log('✓ 清理完成');
    }
    
    console.log('✓ 构建后处理完成');
  } catch (error) {
    console.error('✗ 构建后处理失败:', error);
    process.exit(1);
  }
}

postBuild();
