'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Item } from '@/types';
import WantedCover from '@/components/WantedCover';

interface ItemImageCarouselProps {
  item: Item;
}

const SWIPE_THRESHOLD = 42;

export default function ItemImageCarousel({ item }: ItemImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const images = item.images.filter(Boolean);
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;

  const goToImage = (index: number) => {
    if (!hasImages) return;
    const nextIndex = (index + images.length) % images.length;
    setCurrentIndex(nextIndex);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || !hasMultipleImages) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    goToImage(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
  };

  const currentImage = images[currentIndex];

  return (
    <>
      <div className="overflow-hidden rounded-[34px] border border-[rgba(201,189,171,0.42)] bg-[#f7efe4] shadow-[0_22px_60px_rgba(176,157,135,0.12)]">
        <div
          className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),rgba(247,239,228,0.94))] p-3 lg:aspect-[5/4] lg:p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasImages ? (
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[#efe8dd]">
              <img
                src={currentImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              />
              <div className="absolute inset-0 bg-white/24" />
              <img
                src={currentImage}
                alt={item.title}
                className="relative z-10 h-full w-full object-contain transition-opacity duration-200"
              />

              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={() => goToImage(currentIndex - 1)}
                    className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/78 text-[#66746b] shadow-sm backdrop-blur-sm transition hover:bg-white sm:flex"
                    aria-label="上一张图片"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToImage(currentIndex + 1)}
                    className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/78 text-[#66746b] shadow-sm backdrop-blur-sm transition hover:bg-white sm:flex"
                    aria-label="下一张图片"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/36 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {currentIndex + 1} / {images.length}
                  </div>
                  <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        aria-label={`查看第 ${index + 1} 张图片`}
                        onClick={() => goToImage(index)}
                        className={`h-1.5 rounded-full transition-all ${index === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/58'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : item.listingType === 'wanted' ? (
            <WantedCover item={item} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[28px] bg-white/72 text-[#9a8f80]">
              <span className="text-5xl">📦</span>
              <span className="text-xs font-semibold">图片暂不可用</span>
            </div>
          )}
        </div>
      </div>

      {hasMultipleImages && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image}-thumb-${index}`}
              type="button"
              onClick={() => goToImage(index)}
              className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-[22px] border bg-white transition ${index === currentIndex ? 'border-[#a8c3b1] ring-2 ring-[#a8c3b1]/20' : 'border-[rgba(201,189,171,0.42)]'}`}
              aria-label={`查看第 ${index + 1} 张图片`}
            >
              <img src={image} alt={`${item.title} ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
