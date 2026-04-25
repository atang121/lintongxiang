/**
 * 客户端图片压缩工具
 * 使用 Canvas 压缩图片，避免 base64 过大导致上传慢/失败
 */

export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  size: number; // bytes
}

/**
 * 压缩图片
 * @param file 原始文件
 * @param maxWidth 最大宽度，默认 1200px
 * @param quality JPEG 质量，默认 0.85
 * @returns 压缩后的 dataUrl
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算缩放后的尺寸
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // 用 Canvas 压缩
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 尝试使用 WebP（更小），不支持则降级到 JPEG
        let dataUrl: string;
        let mimeType = 'image/jpeg';

        // 检查浏览器是否支持 canvas.toBlob
        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 使用 WebP 如果文件更小
                canvas.toBlob(
                  (webpBlob) => {
                    if (webpBlob && webpBlob.size < blob.size) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        resolve({
                          dataUrl: reader.result as string,
                          width,
                          height,
                          size: webpBlob.size,
                        });
                      };
                      reader.readAsDataURL(webpBlob);
                    } else {
                      const reader = new FileReader();
                      reader.onload = () => {
                        resolve({
                          dataUrl: reader.result as string,
                          width,
                          height,
                          size: blob.size,
                        });
                      };
                      reader.readAsDataURL(blob);
                    }
                  },
                  'image/webp',
                  quality
                );
              } else {
                reject(new Error('Canvas 压缩失败'));
              }
            },
            'image/jpeg',
            quality
          );
        } else {
          // 降级方案：使用 toDataURL
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          // 估算大小（base64 解码）
          const base64 = dataUrl.split(',')[1];
          const size = Math.round((base64.length * 3) / 4);
          resolve({ dataUrl, width, height, size });
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 获取文件的压缩预览（用于在上传前显示）
 * 返回一个较小的预览图，不用于上传
 */
export function createPreview(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}
