import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 🔑 เชื่อมต่อ Supabase
const supabaseUrl = 'https://aaqxswdaxdcstbdrncyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcXhzd2RheGRjc3RiZHJuY3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTY1MTQsImV4cCI6MjA5NjgzMjUxNH0.F_kBgTkozdklsQT524tmGu4qjjcPmxi-wlni7LCVUaM';
const supabase = createClient(supabaseUrl, supabaseKey);

const { width } = Dimensions.get('window');

const initialArtistsList = ['สนธยา', 'โก๊ะ', 'ต่อ', 'พ่อดอกไม้', 'เจมส์', 'น้องพีพี', 'เอม', 'กิ๊ก', 'นัท', 'ซูซู'];
const defaultArtists = initialArtistsList.map((name, index) => ({
  id: 'artist_' + index, name: name, malai: 0, cash: 0, history: [], avatar: ''
}));

export default function App() {
  const LEADER_NAME = "สนธยา";
  const ADMIN_PIN = "1410"; 

  const [artists, setArtists] = useState(defaultArtists);
  const [role, setRole] = useState(null); 
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [customGiverName, setCustomGiverName] = useState('');
  const vipNames = ['ไม่ระบุชื่อ', 'พี่สร', 'พี่สาวใจดี', 'พี่นางฟ้า', 'แม่รอย'];
  const [editingArtist, setEditingArtist] = useState(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [currentDateObj, setCurrentDateObj] = useState(new Date());

  const getThaiDateStr = (dateObj) => dateObj.toLocaleDateString('th-TH');
  const viewDateStr = getThaiDateStr(currentDateObj);
  const todayStr = getThaiDateStr(new Date()); 

  const validArtists = Array.isArray(artists) ? artists : defaultArtists;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('likay_state').select('data').eq('id', 1).single();
      if (data && data.data && Array.isArray(data.data)) {
        setArtists(data.data);
      }
    } catch (e) {
      console.log("Fetch Error:", e);
    }
  };

  const saveDataToCloud = async (newData) => {
    setArtists(newData);
    try {
      await supabase.from('likay_state').upsert({ id: 1, data: newData });
    } catch (e) {
      alert("⚠️ เชื่อมต่อระบบคลาวด์มีปัญหาครับ");
    }
  };

  const changeDay = (days) => {
    const newDate = new Date(currentDateObj);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDateObj(newDate);
  };

  const getTotalsByDate = (artist, targetDateStr) => {
    if (!artist) return { malai: 0, cash: 0, dayHistory: [] };
    let malai = 0; let cash = 0;
    const historyArray = Array.isArray(artist.history) ? artist.history : [];
    const dayHistory = historyArray.filter(h => h.date === targetDateStr);
    
    dayHistory.forEach(item => {
      if (item.type === 'malai') malai += (item.amount || 0);
      if (item.type === 'cash') cash += (item.amount || 0);
    });
    return { malai, cash, dayHistory };
  };

  // 🛡️ กฎแบ่งเงินหัวหน้า: ได้ส่วนแบ่ง 50% เฉพาะตอนที่ยอดมาลัยศิลปิน >= 10 พวง
  const getLeaderTotalByDate = () => {
    let total = 0;
    validArtists.forEach(artist => {
      const { malai } = getTotalsByDate(artist, viewDateStr);
      if (artist.name !== LEADER_NAME && malai >= 10) {
          total += (malai * 10); // หักเข้ากองกลาง 10 บาท/พวง
      }
    });
    return total;
  };

  const handleAdminLogin = () => {
    if (pinInput === ADMIN_PIN) {
      setRole('admin'); setCurrentScreen('dashboard'); setShowPinModal(false); setPinInput('');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง!');
    }
  };

  const handleArtistLogin = () => {
    setRole('artist'); setCurrentScreen('artistView');
  };

  const logout = () => {
    setRole(null); setCurrentScreen('login'); setIsMenuOpen(false);
  };

  const addNewArtist = () => {
    if (newArtistName.trim() !== '') {
      const updatedArtists = [...validArtists, { id: Date.now().toString(), name: newArtistName, history: [], avatar: '' }];
      saveDataToCloud(updatedArtists);
      setNewArtistName('');
    }
  };

  const handlePressTip = (id, amount, type) => {
    setTransaction({ id, amount, type }); setCustomGiverName(''); setIsModalVisible(true);
  };

  const confirmTip = (giverName) => {
    const finalName = giverName || customGiverName || 'ไม่ระบุชื่อ';
    const { id, amount, type } = transaction;

    const updatedArtists = validArtists.map(artist => {
      if (artist.id === id) {
        let logMsg = type === 'malai' ? `🌸 ${finalName} ให้ ${amount} พวง` : `💰 ${finalName} ให้ ${amount} บ.`;
        const historyArray = Array.isArray(artist.history) ? artist.history : [];
        const newHistoryItem = { id: Date.now().toString(), type, amount, text: logMsg, isPaid: false, date: todayStr };
        return { ...artist, history: [newHistoryItem, ...historyArray] };
      }
      return artist;
    });
    saveDataToCloud(updatedArtists);
    setIsModalVisible(false);
  };

  const togglePaymentStatus = (artistId, historyId) => {
    const updatedArtists = validArtists.map(artist => {
      if (artist.id === artistId) {
        const historyArray = Array.isArray(artist.history) ? artist.history : [];
        return { ...artist, history: historyArray.map(item => item.id === historyId ? { ...item, isPaid: !item.isPaid } : item) };
      }
      return artist;
    });
    saveDataToCloud(updatedArtists);
  };

  const resetTestData = () => {
    Alert.alert(
      "⚠️ ยืนยันการล้างข้อมูล",
      "คุณต้องการลบยอดเงินและรายการทั้งหมดกลับไปเริ่มต้นใหม่ใช่หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ล้างข้อมูล", style: "destructive", 
          onPress: () => {
            saveDataToCloud(defaultArtists);
            alert("✅ ล้างข้อมูลเรียบร้อย เริ่มต้นใหม่ได้เลยครับ!");
            setIsMenuOpen(false);
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.1, base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (Platform.OS === 'web') {
          const img = document.createElement('img');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 150; canvas.height = 150;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 150, 150);
            setEditAvatarUrl(canvas.toDataURL('image/jpeg', 0.5));
          };
          img.src = asset.uri;
        } else {
          setEditAvatarUrl(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (e) { alert("เกิดข้อผิดพลาดในการดึงรูป"); }
  };

  const saveProfileEdit = async () => {
    const updatedArtists = validArtists.map(artist => 
      artist.id === editingArtist.id ? { ...artist, avatar: editAvatarUrl } : artist
    );
    await saveDataToCloud(updatedArtists);
    alert("✅ บันทึกรูปสำเร็จ!");
    setEditingArtist(null); 
  };

  // --- UI Components ---
  const renderHeader = (title) => (
    <View style={[styles.header, { position: 'relative', zIndex: 9999 }]}>
      {role && (
        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.hamburgerBtn}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dateBtn}>
        <Text style={styles.dateBtnText}>◀ วันก่อนหน้า</Text>
      </TouchableOpacity>
      <Text style={styles.dateText}>📅 {viewDateStr}</Text>
      <TouchableOpacity onPress={() => changeDay(1)} style={styles.dateBtn}>
        <Text style={styles.dateBtnText}>วันถัดไป ▶</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvatar = (artist) => (
    <View style={styles.avatarContainer}>
      <Image 
        source={{uri: artist.avatar ? artist.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=4A148C&color=fff&size=120`}} 
        style={styles.avatarImage} 
      />
    </View>
  );

  const renderLoginScreen = () => (
    <View style={styles.loginContainer}>
      <View style={styles.logoRing}>
        <Image source={require('../../assets/images/logo-square.png')} style={styles.appLogoImage} />
      </View>
      <Text style={styles.appName}>ระบบบัญชีคณะลิเก</Text>
      <Text style={styles.appSubName}>✨ บริหารงานโดย {LEADER_NAME} ✨</Text>

      <TouchableOpacity style={styles.loginCardAdmin} onPress={() => setShowPinModal(true)}>
        <Text style={styles.loginCardTitle}>👑 เข้าสู่ระบบหัวหน้าคณะ</Text>
        <Text style={styles.loginCardSub}>จัดการมาลัย • สรุปบัญชี • เช็กยอดโอน</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginCardArtist} onPress={handleArtistLogin}>
        <Text style={styles.artistCardTitle}>🌟 เข้าสู่ระบบศิลปิน</Text>
        <Text style={styles.artistCardSub}>เช็กยอดมาลัยและรางวัลของตัวเอง</Text>
      </TouchableOpacity>

      <Modal visible={showPinModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔒 รหัสผ่านหัวหน้าคณะ</Text>
            <TextInput style={styles.pinInput} keyboardType="number-pad" secureTextEntry={true} maxLength={4} value={pinInput} onChangeText={setPinInput} placeholder="••••" placeholderTextColor="#CCC" autoFocus={true} />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPinModal(false)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdminLogin}><Text style={styles.btnText}>เข้าสู่ระบบ</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderDashboardScreen = () => {
    let todayMalai = 0, todayCash = 0, todayLeaderShare = 0;
    let allTimeMalai = 0, allTimeCash = 0, allTimeLeaderShare = 0;
    let totalPendingPay = 0;

    validArtists.forEach(artist => {
      const historyArray = Array.isArray(artist.history) ? artist.history : [];
      
      const dailyMalaiTotals = {};
      historyArray.forEach(item => {
        if (item.type === 'malai') {
          dailyMalaiTotals[item.date] = (dailyMalaiTotals[item.date] || 0) + item.amount;
        }
      });

      historyArray.forEach(item => {
        const isToday = item.date === viewDateStr;
        const dailyTotal = dailyMalaiTotals[item.date] || 0;
        
        // 🛡️ กฎการคำนวณ Dashboard ที่แม่นยำ
        const isSplit = artist.name !== LEADER_NAME && dailyTotal >= 10;
        const artistRate = isSplit ? 10 : 20;
        const leaderRate = isSplit ? 10 : 0;

        if (item.type === 'malai') {
          allTimeMalai += item.amount;
          allTimeLeaderShare += (item.amount * leaderRate);
          if (isToday) {
            todayMalai += item.amount;
            todayLeaderShare += (item.amount * leaderRate);
          }
          if (!item.isPaid) totalPendingPay += (item.amount * artistRate);
        }

        if (item.type === 'cash') {
          allTimeCash += item.amount;
          if (isToday) todayCash += item.amount;
          if (!item.isPaid) totalPendingPay += item.amount;
        }
      });

      const datesWithUnpaid = new Set(historyArray.filter(h => !h.isPaid).map(h => h.date));
      datesWithUnpaid.forEach(date => {
         if (dailyMalaiTotals[date] >= 10) totalPendingPay += 100;
      });
    });

    return (
      <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
        {renderHeader('📊 แดชบอร์ดการเงิน')}
        {renderDateSelector()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardCard}>
            <Text style={styles.dashTitle}>📍 สรุปยอดวันนี้ ({viewDateStr})</Text>
            <Text style={styles.dashText}>🌸 มาลัยรวม: {todayMalai} พวง</Text>
            <Text style={styles.dashText}>💰 เงินสดรวม: {todayCash.toLocaleString()} บ.</Text>
            <View style={styles.dashLine} />
            <Text style={styles.dashHighlight}>👑 ส่วนแบ่งหัวหน้า: {todayLeaderShare.toLocaleString()} บ.</Text>
            <Text style={{fontSize: 11, color: '#888'}}>*หัก 50% เฉพาะศิลปินที่ได้มาลัย 10 พวงขึ้นไป</Text>
          </View>
          <View style={[styles.dashboardCard, {backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderWidth: 1}]}>
            <Text style={[styles.dashTitle, {color: '#E65100'}]}>⏳ ยอดรวมค้างโอนศิลปินทั้งหมด</Text>
            <Text style={{fontSize: 32, fontWeight: 'bold', color: '#E65100', marginVertical: 10, textAlign: 'center'}}>{totalPendingPay.toLocaleString()} บาท</Text>
            <Text style={{fontSize: 12, color: '#795548', textAlign: 'center'}}>*เช็กยอดรายคนและกดจ่ายเงินได้ที่เมนู 'สรุปบัญชี'</Text>
          </View>
          <View style={{height: 40}} />
        </ScrollView>
      </View>
    );
  };

  const renderArtistScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {renderHeader('บอร์ดสรุปยอดศิลปิน')}
      {renderDateSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {validArtists.map(artist => {
          const { malai, cash } = getTotalsByDate(artist, viewDateStr);
          const isSplit = artist.name !== LEADER_NAME && malai >= 10;
          const rate = isSplit ? 10 : 20;

          return (
            <View key={artist.id} style={styles.artistReadCard}>
              <View style={styles.profileRow}>
                {renderAvatar(artist)}
                <View>
                  <Text style={styles.artistReadName}>{artist.name}</Text>
                  <TouchableOpacity style={styles.editProfileBtn} onPress={() => { setEditingArtist(artist); setEditAvatarUrl(artist.avatar); }}>
                    <Text style={styles.editProfileText}>✏️ เปลี่ยนรูป</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.readDataRow}>
                <View style={styles.readDataBox}>
                  <Text style={styles.readDataLabel}>🌸 มาลัย</Text>
                  <Text style={[styles.readDataValue, {color: '#E91E63'}]}>{malai}</Text>
                  <Text style={{fontSize: 10, color: '#888'}}>({rate} บ./พวง)</Text>
                </View>
                <View style={styles.readDataBox}>
                  <Text style={styles.readDataLabel}>💰 เงินสด</Text>
                  <Text style={[styles.readDataValue, {color: '#2E7D32'}]}>{cash}</Text>
                  <Text style={{fontSize: 10, color: '#888'}}>(รับเต็ม 100%)</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );

  const renderAddTipScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {renderHeader('หน้าเวที: บันทึกยอด')}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>กำลังบันทึกบัญชีของวันที่: {todayStr}</Text>
        </View>
        <View style={styles.addNameCompact}>
          <TextInput style={styles.inputCompact} placeholder="พิมพ์ชื่อรับเชิญใหม่..." value={newArtistName} onChangeText={setNewArtistName} />
          <TouchableOpacity style={styles.addBtnCompact} onPress={addNewArtist}>
            <Text style={styles.addBtnText}>+ เพิ่มศิลปิน</Text>
          </TouchableOpacity>
        </View>

        {validArtists.map(artist => {
          const { malai, cash, dayHistory } = getTotalsByDate(artist, todayStr);
          return (
            <View key={artist.id} style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <View style={styles.profileRow}>
                  {renderAvatar(artist)}
                  <View>
                    <Text style={styles.adminArtistName}>{artist.name}</Text>
                  </View>
                </View>
                <Text style={styles.adminSummaryText}>🌸 {malai}  |  💰 {cash}</Text>
              </View>
              
              <View style={styles.actionRow}>
                <Text style={styles.actionLabel}>มาลัย</Text>
                {[5, 10, 15, 25].map(num => (
                  <TouchableOpacity key={`m-${num}`} style={styles.btnSmallMalai} onPress={() => handlePressTip(artist.id, num, 'malai')}>
                    <Text style={styles.btnSmallText}>+{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <Text style={styles.actionLabel}>เงินสด</Text>
                {[100, 200, 500, 1000].map(num => (
                  <TouchableOpacity key={`c-${num}`} style={styles.btnSmallCash} onPress={() => handlePressTip(artist.id, num, 'cash')}>
                    <Text style={styles.btnSmallText}>+{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );

  const renderSummaryScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {renderHeader('บัญชีหลังบ้าน')}
      {renderDateSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {validArtists.map(artist => {
          const { malai, cash, dayHistory } = getTotalsByDate(artist, viewDateStr);
          
          // 🛡️ กรองเฉพาะรายการที่ "ยังไม่จ่าย" มาแสดง
          const unpaidHistory = dayHistory.filter(h => !h.isPaid);

          // ซ่อนการ์ดถ้ายอดเป็น 0 และไม่มีรายการค้าง
          if (malai === 0 && cash === 0 && unpaidHistory.length === 0) return null;

          // คำนวณเรทเงินมาลัย
          const isSplit = artist.name !== LEADER_NAME && malai >= 10;
          const rate = isSplit ? 10 : 20;

          // คำนวณยอดเงินเฉพาะที่ "ยังไม่ได้จ่าย"
          let unpaidMalai = 0; let unpaidCash = 0;
          unpaidHistory.forEach(item => {
            if (item.type === 'malai') unpaidMalai += item.amount;
            if (item.type === 'cash') unpaidCash += item.amount;
          });

          const pendingMalaiPay = unpaidMalai * rate;
          const pendingCashPay = unpaidCash;
          const pendingBonus = (malai >= 10 && unpaidHistory.length > 0) ? 100 : 0;
          const finalPay = pendingMalaiPay + pendingCashPay + pendingBonus;

          return (
            <View key={artist.id} style={styles.summaryCard}>
              <View style={styles.profileRow}>
                {renderAvatar(artist)}
                <Text style={styles.artistName}>🌟 {artist.name}</Text>
              </View>
              
              <View style={styles.sumBox}>
                <Text style={{fontWeight: 'bold', color: '#4A148C', marginBottom: 5}}>📌 ยอดรวมที่หาได้วันนี้ (รวมที่จ่ายแล้ว):</Text>
                {artist.name === LEADER_NAME ? (
                  <Text style={styles.sumText}>🌸 มาลัย {malai} พวง ↳ (รับเต็มไม่มีหัก): <Text style={{fontWeight:'bold', color:'#333'}}>{malai * 20}</Text> บ.</Text>
                ) : (
                  <Text style={styles.sumText}>
                    🌸 มาลัย {malai} พวง ↳ {malai >= 10 ? `แบ่งเข้าวง 50%: ` : `รับเต็ม 100%: `}
                    <Text style={{fontWeight:'bold', color:'#333'}}>{malai * rate}</Text> บ.
                  </Text>
                )}
                <Text style={styles.sumText}>💰 รางวัลสด: <Text style={{fontWeight:'bold', color:'#333'}}>{cash}</Text> บ.</Text>
                {malai >= 10 && <Text style={styles.sumBonus}>🎉 โบนัสแตก (10 พวง): +100 บ.</Text>}
              </View>
              
              <View style={styles.historyBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                   <Text style={styles.historyTitle}>⏳ รายการค้างจ่าย (กดเพื่อโอน)</Text>
                   <Text style={styles.finalPayText}>รวมยอดโอน: {finalPay.toLocaleString()} บ.</Text>
                </View>

                {/* ถ้ารายการค้างจ่ายหมดแล้ว ให้ขึ้นข้อความสีเขียว */}
                {unpaidHistory.length === 0 ? (
                  <View style={{backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, alignItems: 'center'}}>
                    <Text style={{color: '#2E7D32', fontWeight: 'bold'}}>✅ จ่ายครบหมดแล้ว (ซ่อนรายการอัตโนมัติ)</Text>
                  </View>
                ) : (
                  unpaidHistory.map(item => (
                    <TouchableOpacity key={item.id} style={[styles.historyRow, styles.historyPendingBg]} onPress={() => togglePaymentStatus(artist.id, item.id)}>
                      <Text style={styles.historyText} numberOfLines={1}>• {item.text}</Text>
                      <View style={{backgroundColor: '#4A148C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}}>
                        <Text style={{color: '#FFF', fontSize: 11, fontWeight: 'bold'}}>คลิกเพื่อจ่าย</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          );
        })}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {currentScreen === 'login' && renderLoginScreen()}
      {currentScreen === 'dashboard' && renderDashboardScreen()}
      {currentScreen === 'artistView' && renderArtistScreen()}
      {currentScreen === 'addTip' && renderAddTipScreen()}
      {currentScreen === 'summary' && renderSummaryScreen()}

      <Modal visible={!!editingArtist} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>อัปโหลดรูปโปรไฟล์ใหม่</Text>
            {editAvatarUrl ? (
              <Image source={{ uri: editAvatarUrl }} style={{ width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#4A148C' }} />
            ) : (
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEE', alignSelf: 'center', marginBottom: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{color: '#999'}}>ไม่มีรูป</Text>
              </View>
            )}
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}><Text style={styles.uploadBtnText}>📸 เปิดอัลบั้มรูปภาพ</Text></TouchableOpacity>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingArtist(null)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#4A148C'}]} onPress={saveProfileEdit}><Text style={styles.btnText}>อัปเดตข้อมูล</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isMenuOpen} transparent={true} animationType="fade">
        <View style={styles.menuOverlay}>
          <View style={styles.menuBoxFull}>
            <Text style={[styles.menuTitle, {fontSize: 24, marginBottom: 40}]}>เมนูระบบ 🎭</Text>
            {role === 'admin' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('dashboard'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>📊 แดชบอร์ดการเงิน</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('addTip'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>📝 ไปหน้าเวที (บันทึกยอด)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('summary'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>💰 ไปหลังบ้าน (สรุปบัญชี / โอนเงิน)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {marginTop: 30, backgroundColor: '#FFF3E0', borderRadius: 8}]} onPress={resetTestData}>
                  <Text style={[styles.menuItemText, {color: '#E65100', fontWeight: 'bold'}]}>🗑️ ล้างข้อมูลทดลองทิ้งทั้งหมด</Text>
                </TouchableOpacity>
              </>
            )}
            {role === 'artist' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); }}>
                <Text style={styles.menuItemText}>🌟 บอร์ดศิลปิน</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0, marginTop: 20, backgroundColor: '#FFEBEE', borderRadius: 10}]} onPress={logout}>
              <Text style={[styles.menuItemText, {color: '#D32F2F', fontWeight: 'bold', textAlign: 'center'}]}>🚪 ออกจากระบบ</Text>
            </TouchableOpacity>
            <View style={{flex: 1}} />
            <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setIsMenuOpen(false)}><Text style={styles.closeMenuText}>✕ ปิดหน้าต่าง</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- ตกแต่งความสวยงาม UI ---
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4A148C', padding: 15, paddingTop: Platform.OS === 'ios' ? 45 : 15, elevation: 5 }, 
  hamburgerBtn: { position: 'absolute', left: 10, bottom: 8, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  hamburgerIcon: { fontSize: 28, color: '#FFD700' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  content: { padding: 12 },
  
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
  dateBtn: { backgroundColor: '#F3E5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  dateBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 12 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#EEE', borderWidth: 2, borderColor: '#FFD700', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 30, resizeMode: 'cover' }, 
  
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: '#1A1A2E' },
  logoRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginBottom: 25, backgroundColor: '#FFF', overflow: 'hidden' },
  appLogoImage: { width: '100%', height: '100%', borderRadius: 70 }, 
  appName: { fontSize: 32, fontWeight: '900', color: '#FFD700', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  appSubName: { fontSize: 16, color: '#E0E0E0', marginBottom: 45, letterSpacing: 1 },
  
  loginCardAdmin: { backgroundColor: '#4A148C', width: '100%', paddingVertical: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#7B1FA2', elevation: 5 },
  loginCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', marginBottom: 4 },
  loginCardSub: { fontSize: 13, color: '#E1BEE7' },
  
  loginCardArtist: { backgroundColor: '#FFF', width: '100%', paddingVertical: 20, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#4A148C' },
  artistCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A148C', marginBottom: 4 },
  artistCardSub: { fontSize: 13, color: '#666' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  pinInput: { backgroundColor: '#F9F9F9', fontSize: 32, textAlign: 'center', padding: 15, borderRadius: 10, marginBottom: 25, letterSpacing: 15, color: '#4A148C', borderWidth: 1, borderColor: '#DDD' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { backgroundColor: '#9E9E9E', padding: 14, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#4A148C', padding: 14, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  artistReadCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  artistReadName: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  readDataRow: { flexDirection: 'row' },
  readDataBox: { alignItems: 'center', marginLeft: 15 },
  readDataLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  readDataValue: { fontSize: 20, fontWeight: 'bold' }, 

  infoBanner: { backgroundColor: '#E8EAF6', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#C5CAE9' }, 
  infoBannerText: { color: '#3F51B5', fontWeight: 'bold', fontSize: 14 },
  addNameCompact: { flexDirection: 'row', marginBottom: 15 },
  inputCompact: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CCC', fontSize: 15 },
  addBtnCompact: { backgroundColor: '#4CAF50', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 8, marginLeft: 10, elevation: 2 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  
  adminCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#EEE' },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 12, marginBottom: 12 },
  adminArtistName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  adminSummaryText: { fontSize: 15, fontWeight: 'bold', color: '#4A148C' }, 
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  actionLabel: { fontSize: 14, color: '#555', width: 45, fontWeight: 'bold' },
  
  btnSmallMalai: { backgroundColor: '#E91E63', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, flex: 0.23, alignItems: 'center', elevation: 2 },
  btnSmallCash: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, flex: 0.23, alignItems: 'center', elevation: 2 },
  btnSmallText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  
  miniLog: { backgroundColor: '#F5F5F5', padding: 8, borderRadius: 6, marginTop: 5, borderLeftWidth: 3, borderLeftColor: '#4A148C' },
  miniLogText: { fontSize: 12, color: '#666' },

  vipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  vipBtn: { backgroundColor: '#F3E5F5', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#CE93D8', width: '31%', marginBottom: 10, alignItems: 'center' },
  vipBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 12 },
  modalInput: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#CCC', marginBottom: 25, fontSize: 16 },

  leaderCard: { backgroundColor: '#4A148C', padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center', elevation: 4 },
  leaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFD700' },
  leaderMoney: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginVertical: 8 },
  leaderSub: { fontSize: 13, color: '#E1BEE7' },
  summaryCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#4A148C' },
  artistName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sumBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: '#EEE' },
  sumText: { fontSize: 13, color: '#555', marginBottom: 6 },
  sumBonus: { fontSize: 14, color: '#E91E63', fontWeight: 'bold', marginTop: 4 }, 
  finalPayText: { fontSize: 18, color: '#E91E63', fontWeight: 'bold', textAlign: 'right' },
  historyBox: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#4A148C' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 6, marginBottom: 6 },
  historyPendingBg: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2' },
  historyText: { fontSize: 14, color: '#333', flex: 1, fontWeight: 'bold' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuBoxFull: { width: '80%', maxWidth: 350, height: '100%', backgroundColor: '#FFF', padding: 25, paddingTop: 60, elevation: 15 },
  menuTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A148C' },
  menuItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  menuItemText: { fontSize: 16, color: '#333' },
  closeMenuBtn: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', marginBottom: 20 },
  closeMenuText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  
  editProfileBtn: { marginTop: 6, backgroundColor: '#F5F5F5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: '#DDD', alignSelf: 'flex-start' },
  editProfileText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  uploadBtn: { backgroundColor: '#F3E5F5', padding: 15, borderRadius: 10, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#CE93D8' },
  uploadBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 16 },

  dashboardCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#EEE' },
  dashTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A148C', marginBottom: 15 },
  dashText: { fontSize: 16, color: '#333', marginBottom: 8 },
  dashLine: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
  dashHighlight: { fontSize: 18, fontWeight: 'bold', color: '#E91E63' }
});