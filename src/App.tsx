import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* 토스 SDK 가상 브릿지 (오류 방지) */
const loadTossPay = async (opts: any) => { opts.onSuccess?.(); };
const shareUrl = (opts: any) => { alert(`[착착] 공유하기: ${opts.title}`); };

/* ════════════════════════════════════════════════════════════════
 * 1. 설정 및 타입
 * ════════════════════════════════════════════════════════════════ */
type SearchMode = 'exact' | 'dupe';
type CategoryId = 'top' | 'bottom' | 'shoes' | 'outer' | 'bag' | 'acc';

interface DetectedCategory {
  id: CategoryId;
  label: string;
  confidence: number;
}

interface RecommendationItem {
  id: string;
  categoryId: CategoryId;
  platform: string;
  brand: string;
  name: string;
  price: number;
  shippingFee: number;
  originalPrice?: number;
  imageUrl: string;
  purchaseUrl: string;
  payToken?: string;
  similarity?: number;
}

const C = {
  blue: '#3182F6',
  blueLight: '#E8F3FF',
  blueDark: '#1B64DA',
  text: '#191F28',
  text2: '#4E5968',
  text3: '#6B7684',
  text4: '#8B95A1',
  line: '#E5E8EB',
  bg: '#F2F4F6',
  red: '#F04452',
  white: '#FFFFFF',
} as const;

const formatWon = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/* ════════════════════════════════════════════════════════════════
 * 2. 샘플 데이터 (AI 분석 결과 가상 테스트용)
 * ════════════════════════════════════════════════════════════════ */
const MOCK_CATEGORIES: DetectedCategory[] = [
  { id: 'top', label: '👕 상의 (98%)', confidence: 0.98 },
  { id: 'outer', label: '🧥 아우터 (85%)', confidence: 0.85 },
];

const MOCK_EXACT_RESULTS: RecommendationItem[] = [
  {
    id: 'ex-1',
    categoryId: 'top',
    platform: '무신사',
    brand: 'Vebrae',
    name: '시그니처 슬림핏 후드 티셔츠',
    price: 49000,
    shippingFee: 0,
    originalPrice: 69000,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80',
    purchaseUrl: 'https://musinsa.com',
  },
  {
    id: 'ex-2',
    categoryId: 'top',
    platform: '29CM',
    brand: 'Vebrae',
    name: '시그니처 슬림핏 후드 티셔츠',
    price: 52000,
    shippingFee: 2500,
    originalPrice: 69000,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80',
    purchaseUrl: 'https://29cm.co.kr',
  },
  {
    id: 'ex-3',
    categoryId: 'top',
    platform: '지그재그',
    brand: 'Vebrae',
    name: '시그니처 슬림핏 후드 티셔츠',
    price: 55000,
    shippingFee: 0,
    originalPrice: 69000,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80',
    purchaseUrl: 'https://zigzag.kr',
  },
];

const MOCK_DUPE_RESULTS: RecommendationItem[] = [
  {
    id: 'dp-1',
    categoryId: 'top',
    platform: '쿠팡',
    brand: '베이직웨어',
    name: '데일리 소프트 슬림핏 후디',
    price: 19800,
    shippingFee: 0,
    imageUrl: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&auto=format&fit=crop&q=80',
    purchaseUrl: 'https://coupang.com',
    similarity: 94,
  },
  {
    id: 'dp-2',
    categoryId: 'top',
    platform: '에이블리',
    brand: '모던무드',
    name: '어반 스트릿 후드 자켓',
    price: 24500,
    shippingFee: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
    purchaseUrl: 'https://a-bly.com',
    similarity: 88,
  },
];

/* ════════════════════════════════════════════════════════════════
 * 3. 메인 앱 컴포넌트
 * ════════════════════════════════════════════════════════════════ */
export const ChakChakApp = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<SearchMode>('exact');
  const [analyzing, setAnalyzing] = useState(false);
  const [categories, setCategories] = useState<DetectedCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('top');
  const [results, setResults] = useState<RecommendationItem[]>([]);
  const [wished, setWished] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);

    // AI 분석 가상 딜레이 (1.2초 후 결과 출력)
    setTimeout(() => {
      setAnalyzing(false);
      setCategories(MOCK_CATEGORIES);
      setResults(mode === 'exact' ? MOCK_EXACT_RESULTS : MOCK_DUPE_RESULTS);
      showToast('✨ AI 분석이 완료되었어요!');
    }, 1200);
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    if (preview) {
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        setResults(newMode === 'exact' ? MOCK_EXACT_RESULTS : MOCK_DUPE_RESULTS);
      }, 600);
    }
  };

  const toggleWish = (id: string) => {
    setWished((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('알림을 해제했어요.');
      } else {
        next.add(id);
        showToast('🔔 가격이 내려가면 토스 알림으로 알려드릴게요!');
      }
      return next;
    });
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => (a.price + a.shippingFee) - (b.price + b.shippingFee));
  }, [results]);

  const lowestPrice = sortedResults.length > 0 ? sortedResults[0].price + sortedResults[0].shippingFee : 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 60px', fontFamily: 'Pretendard, sans-serif', color: C.text }}>
      {/* 헤더 */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: C.text }}>착착 (ChakChak)</h1>
        <p style={{ color: C.text3, margin: '4px 0 0', fontSize: 14 }}>사진 한 장으로 찾는 최저가 & 가성비 대체재</p>
      </header>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: C.bg, borderRadius: 12, marginBottom: 16 }}>
        <button
          onClick={() => handleModeChange('exact')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            backgroundColor: mode === 'exact' ? C.white : 'transparent',
            color: mode === 'exact' ? C.text : C.text4,
            boxShadow: mode === 'exact' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          🔍 동일 상품 최저가
        </button>
        <button
          onClick={() => handleModeChange('dupe')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            backgroundColor: mode === 'dupe' ? C.white : 'transparent',
            color: mode === 'dupe' ? C.text : C.text4,
            boxShadow: mode === 'dupe' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}
        >
          💡 가성비 대체재
        </button>
      </div>

      {/* 이미지 업로드 영역 */}
      <section style={{ marginBottom: 20 }}>
        <input type="file" accept="image/*" id="file-input" onChange={handleFileUpload} style={{ display: 'none' }} />
        {preview && (
          <img
            src={preview}
            alt="업로드한 이미지"
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 16, marginBottom: 12 }}
          />
        )}
        <label
          htmlFor="file-input"
          style={{
            display: 'block',
            padding: '16px',
            backgroundColor: C.blue,
            color: C.white,
            textAlign: 'center',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(49, 130, 246, 0.2)',
          }}
        >
          {analyzing ? '⚡️ AI가 쇼핑몰 최저가를 훑는 중...' : preview ? '📸 다른 사진으로 재검색' : '📸 옷 사진 업로드하기'}
        </label>
      </section>

      {/* 카테고리 태그 */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {categories.map((c) => (
            <span
              key={c.id}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: activeCategory === c.id ? C.text : C.bg,
                color: activeCategory === c.id ? C.white : C.text2,
              }}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* 검색 결과 목록 */}
      {!analyzing && sortedResults.length > 0 && (
        <section>
          <div style={{ fontSize: 13, color: C.text4, marginBottom: 12 }}>
            상품가 + 배송비를 합친 **최종 결제금액 순** 정렬입니다.
          </div>

          {sortedResults.map((item) => {
            const finalPrice = item.price + item.shippingFee;
            const isLowest = finalPrice === lowestPrice;
            const isWished = wished.has(item.id);

            return (
              <div
                key={item.id}
                style={{
                  border: isLowest ? `2px solid ${C.blue}` : `1px solid ${C.line}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  display: 'flex',
                  gap: 12,
                  backgroundColor: C.white,
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {isLowest && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.white, backgroundColor: C.blue, padding: '2px 6px', borderRadius: 4 }}>
                        🏆 최저가
                      </span>
                    )}
                    {item.similarity && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.blueDark, backgroundColor: C.blueLight, padding: '2px 6px', borderRadius: 4 }}>
                        유사도 {item.similarity}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.text4 }}>{item.platform}</div>
                  <div style={{ fontWeight: 'bold', fontSize: 14 }}>{item.brand}</div>
                  <div style={{ fontSize: 13, color: C.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: C.blue, marginTop: 4 }}>
                    {formatWon(item.price)}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>
                    배송비 {item.shippingFee === 0 ? '무료' : formatWon(item.shippingFee)} · 최종 {formatWon(finalPrice)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  <a
                    href={item.purchaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: C.blue,
                      color: C.white,
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    사러가기
                  </a>
                  <button
                    onClick={() => toggleWish(item.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isWished ? C.blueLight : C.bg,
                      color: isWished ? C.blueDark : C.text2,
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {isWished ? '🔔 알림중' : '🔕 찜'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 토스트 알림 팝업 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(25, 31, 40, 0.9)',
            color: C.white,
            padding: '12px 20px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default ChakChakApp;
