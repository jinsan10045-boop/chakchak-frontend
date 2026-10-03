import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

type Tab = 'search' | 'wishlist';
type SearchMode = 'exact' | 'dupe';

interface DetectedCategory {
  id: string;
  label: string;
  confidence: number;
}

interface RecommendationItem {
  id: string;
  categoryId?: string;
  platform: string;
  brand: string;
  name: string;
  price: number;
  shippingFee: number;
  imageUrl: string;
  purchaseUrl: string;
  similarity?: number;
}

interface WishlistItem {
  id: string;
  item_id: string;
  item_name: string;
  brand: string;
  platform: string;
  current_price: number;
  image_url: string;
  purchase_url: string;
  created_at: string;
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
  white: '#FFFFFF',
  red: '#F04452',
} as const;

const formatWon = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export const ChakChakApp = () => {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [mode, setMode] = useState<SearchMode>('exact');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [categories, setCategories] = useState<DetectedCategory[]>([]);
  const [results, setResults] = useState<RecommendationItem[]>([]);
  
  // Supabase 찜목록 데이터
  const [dbWishlist, setDbWishlist] = useState<WishlistItem[]>([]);
  const [wishedSet, setWishedSet] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 1. Supabase에서 찜목록 가져오기
  const fetchWishlistFromSupabase = async () => {
    const { data, error } = await supabase
      .from('wishlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDbWishlist(data);
      setWishedSet(new Set(data.map((item) => item.item_id)));
    }
  };

  useEffect(() => {
    fetchWishlistFromSupabase();
  }, []);

  // 2. 백엔드 FastAPI 서버 호출
  const runAnalysis = async (file: File, searchMode: SearchMode) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('fashion_image', file);
      formData.append('mode', searchMode);

      const res = await fetch('https://chakchak-backend.onrender.com/api/v1/chakchak/analyze', {
  method: 'POST',
  body: formData,
});
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('서버 통신 오류');

      const data = await res.json();
      setCategories(data.categories || []);
      setResults(data.recommendations || []);
      showToast('⚡️ AI 분석 완료! 최저가 정보를 매칭했어요.');
    } catch (err) {
      console.error(err);
      showToast('⚠️ FastAPI 백엔드 서버 연결을 확인해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    runAnalysis(file, mode);
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    if (selectedFile) {
      runAnalysis(selectedFile, newMode);
    }
  };

  // 3. Supabase 찜 추가/삭제
  const toggleWish = async (item: RecommendationItem) => {
    const isWished = wishedSet.has(item.id);

    if (isWished) {
      const { error } = await supabase.from('wishlists').delete().eq('item_id', item.id);
      if (!error) {
        showToast('알림 목록에서 해제했어요.');
        fetchWishlistFromSupabase();
      }
    } else {
      const { error } = await supabase.from('wishlists').insert([
        {
          user_id: 'test-user-1',
          item_id: item.id,
          item_name: item.name,
          brand: item.brand,
          platform: item.platform,
          current_price: item.price + item.shippingFee,
          image_url: item.imageUrl,
          purchase_url: item.purchaseUrl,
          is_alert_enabled: true,
        },
      ]);

      if (!error) {
        showToast('🔔 Supabase DB에 찜 완료!');
        fetchWishlistFromSupabase();
      } else {
        showToast('DB 저장 실패! .env.local을 확인해 주세요.');
      }
    }
  };

  const deleteFromWishlist = async (id: string) => {
    const { error } = await supabase.from('wishlists').delete().eq('id', id);
    if (!error) {
      showToast('삭제되었습니다.');
      fetchWishlistFromSupabase();
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 80px', fontFamily: 'sans-serif', color: C.text }}>
      {/* 타이틀 헤더 */}
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>착착 (ChakChak)</h1>
        <p style={{ color: C.text3, margin: '4px 0 0', fontSize: 14 }}>사진 한 장으로 찾는 최저가 & 가성비 대체재</p>
      </header>

      {/* 메인 탭 메뉴 (검색 vs 내 찜목록) */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.line}`, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom: activeTab === 'search' ? `3px solid ${C.blue}` : 'none',
            backgroundColor: 'transparent',
            fontWeight: 'bold',
            fontSize: 15,
            color: activeTab === 'search' ? C.blue : C.text3,
            cursor: 'pointer',
          }}
        >
          🔍 AI 사진 검색
        </button>
        <button
          onClick={() => {
            setActiveTab('wishlist');
            fetchWishlistFromSupabase();
          }}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom: activeTab === 'wishlist' ? `3px solid ${C.blue}` : 'none',
            backgroundColor: 'transparent',
            fontWeight: 'bold',
            fontSize: 15,
            color: activeTab === 'wishlist' ? C.blue : C.text3,
            cursor: 'pointer',
          }}
        >
          🔔 내 찜목록 ({dbWishlist.length})
        </button>
      </div>

      {/* 탭 1: 검색 화면 */}
      {activeTab === 'search' && (
        <>
          {/* 최저가 vs 가성비 선택 스위치 */}
          <div style={{ display: 'flex', gap: 6, padding: 4, backgroundColor: C.bg, borderRadius: 12, marginBottom: 16 }}>
            <button
              onClick={() => handleModeChange('exact')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                backgroundColor: mode === 'exact' ? C.white : 'transparent',
                color: mode === 'exact' ? C.text : C.text4,
              }}
            >
              🏆 동일 최저가
            </button>
            <button
              onClick={() => handleModeChange('dupe')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                backgroundColor: mode === 'dupe' ? C.white : 'transparent',
                color: mode === 'dupe' ? C.text : C.text4,
              }}
            >
              💡 가성비 대체재
            </button>
          </div>

          {/* 사진 업로드 버튼 */}
          <section style={{ marginBottom: 20 }}>
            <input type="file" accept="image/*" id="file-input" onChange={handleFileUpload} style={{ display: 'none' }} />
            {preview && (
              <img src={preview} alt="업로드 이미지" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 16, marginBottom: 12 }} />
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
              }}
            >
              {analyzing ? '⚡️️ AI 분석 및 최저가 검색 중...' : preview ? '📸 다른 사진으로 재검색' : '📸 옷 사진 업로드하기'}
            </label>
          </section>

          {/* AI 카테고리 태그 */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {categories.map((c) => (
                <span key={c.id} style={{ padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, backgroundColor: C.bg, color: C.text2 }}>
                  {c.label}
                </span>
              ))}
            </div>
          )}

          {/* 결과 카드리스트 */}
          {!analyzing && results.length > 0 && (
            <section>
              {results.map((item) => {
                const isWished = wishedSet.has(item.id);

                return (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${C.line}`,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      display: 'flex',
                      gap: 12,
                      backgroundColor: C.white,
                      alignItems: 'center',
                    }}
                  >
                    <img src={item.imageUrl} alt={item.name} style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: C.text4 }}>{item.platform}</span>
                        {item.similarity && (
                          <span style={{ fontSize: 10, color: C.blueDark, backgroundColor: C.blueLight, padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>
                            유사도 {item.similarity}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: 14 }}>{item.brand}</div>
                      <div style={{ fontSize: 13, color: C.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ fontSize: 15, fontWeight: 'bold', color: C.blue, marginTop: 4 }}>{formatWon(item.price)}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                        구매
                      </a>
                      <button
                        onClick={() => toggleWish(item)}
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
        </>
      )}

      {/* 탭 2: Supabase 실시간 찜목록 화면 */}
      {activeTab === 'wishlist' && (
        <section>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 16 }}>
            Supabase 데이터베이스에 보관된 가격 변동 알림 상품입니다.
          </div>

          {dbWishlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.text4, fontSize: 14 }}>
              아직 찜한 상품이 없어요. 사진을 올려서 최저가를 찜해 보세요!
            </div>
          ) : (
            dbWishlist.map((item) => (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  display: 'flex',
                  gap: 12,
                  backgroundColor: C.white,
                  alignItems: 'center',
                }}
              >
                <img src={item.image_url} alt={item.item_name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.text4 }}>{item.platform} · {item.brand}</div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.item_name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: C.blue, marginTop: 2 }}>
                    {formatWon(item.current_price)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a
                    href={item.purchase_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: C.blueLight,
                      color: C.blueDark,
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    이동
                  </a>
                  <button
                    onClick={() => deleteFromWishlist(item.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: C.bg,
                      color: C.red,
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(25, 31, 40, 0.9)', color: C.white, padding: '12px 20px', borderRadius: 20, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default ChakChakApp;
