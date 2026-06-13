import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  
  // 🚨 State ใหม่สำหรับ Pop-up แจ้งเตือนลบข้อมูลสุดหรู
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

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

  const getLeaderTotalByDate = () => {
    let total = 0;
    validArtists.forEach(artist => {
      const { malai } = getTotalsByDate(artist, viewDateStr);
      if (artist.name !== LEADER_NAME && malai >= 10) {
          total += (malai * 10); 
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

  // 🛡️ ฟังก์ชันสั่งเคลียร์ข้อมูลจริง ยิงตรงเข้าคลาวด์
  const executeResetAllData = () => {
    saveDataToCloud(defaultArtists);
    setShowResetConfirmModal(false);
    setIsMenuOpen(false);
    alert("✨ ล้างข้อมูลทดลองสำเร็จ! ระบบพร้อมใช้งานจริงแล้วครับ");
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
    <View style={styles.header}>
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
          <View style={styles.luxuryPopupBox}>
            <Text style={styles.luxuryPopupTitle}>🔒 รหัสผ่านหัวหน้าคณะ</Text>
            <TextInput style={styles.pinInput} keyboardType="number-pad" secureTextEntry={true} maxLength={4} value={pinInput} onChangeText={setPinInput} placeholder="••••" placeholderTextColor="#999" autoFocus={true} />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.luxuryCancelBtn} onPress={() => setShowPinModal(false)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.luxuryConfirmBtn} onPress={handleAdminLogin}><Text style={styles.btnText}>เข้าสู่ระบบ</Text></TouchableOpacity>
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
      <View style={{ flex: 1, backgroundColor: '#F5F5FA' }}>
        {renderHeader('📊 แดชบอร์ดการเงิน')}
        {renderDateSelector()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardCard}>
            <Text style={styles.dashTitle}>📍 สรุปยอดสะสมวันนี้ ({viewDateStr})</Text>
            <View style={styles.dashDetailRow}><Text style={styles.dashText}>🌸 มาลัยรวมทั้งหมด:</Text><Text style={styles.dashValue}>{todayMalai} พวง</Text></View>
            <View style={styles.dashDetailRow}><Text style={styles.dashText}>💰 รางวัลเงินสดรวม:</Text><Text style={styles.dashValue}>{todayCash.toLocaleString()} บาท</Text></View>
            <View style={styles.dashLine} />
            <Text style={styles.dashHighlight}>👑 ส่วนแบ่งเข้าวงการคลัง: {todayLeaderShare.toLocaleString()} บ.</Text>
            <Text style={{fontSize: 11, color: '#AAA', fontStyle: 'italic', marginTop: 5}}>*หักแบ่ง 50% เฉพาะตอนศิลปินได้มาลัย 10 พวงขึ้นไป/วัน เท่านั้น</Text>
          </View>
          <View style={[styles.dashboardCard, {backgroundColor: '#FFF8F0', borderColor: '#FF9800', borderWidth: 1.5}]}>
            <Text style={[styles.dashTitle, {color: '#E65100'}]}>⏳ ยอดค้างโอนศิลปินรวมทั้งหมด</Text>
            <Text style={{fontSize: 36, fontWeight: 'bold', color: '#E65100', marginVertical: 12, textAlign: 'center'}}>{totalPendingPay.toLocaleString()} บาท</Text>
            <Text style={{fontSize: 12, color: '#E65100', textAlign: 'center', fontWeight: 'bold'}}>*กดโอนเงินสดรายคนได้ที่เมนู 'บัญชีหลังบ้าน' ยอดจะหายไปทันที</Text>
          </View>
          <View style={{height: 40}} />
        </ScrollView>
      </View>
    );
  };

  const renderArtistScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F5F5FA' }}>
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
                    <Text style={styles.editProfileText}>✏️ อัปเดตรูปภาพ</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.readDataRow}>
                <View style={styles.readDataBox}>
                  <Text style={styles.readDataLabel}>🌸 มาลัยรวม</Text>
                  <Text style={[styles.readDataValue, {color: '#E91E63'}]}>{malai} พวง</Text>
                  <Text style={{fontSize: 10, color: '#999'}}>({rate} บ./พวง)</Text>
                </View>
                <View style={styles.readDataBox}>
                  <Text style={styles.readDataLabel}>💰 รางวัลสด</Text>
                  <Text style={[styles.readDataValue, {color: '#2E7D32'}]}>{cash.toLocaleString()} บ.</Text>
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
    <View style={{ flex: 1, backgroundColor: '#F5F5FA' }}>
      {renderHeader('หน้าเวที: บันทึกยอดรางวัล')}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>🎭 คืนนี้กำลังบันทึกรายได้ของวันที่: {todayStr}</Text>
        </View>
        <View style={styles.addNameCompact}>
          <TextInput style={styles.inputCompact} placeholder="พิมพ์ชื่อรับเชิญใหม่..." value={newArtistName} onChangeText={setNewArtistName} placeholderTextColor="#BBB" />
          <TouchableOpacity style={styles.addBtnCompact} onPress={addNewArtist}>
            <Text style={styles.addBtnText}>+ เพิ่มศิลปิน</Text>
          </TouchableOpacity>
        </View>

        {validArtists.map(artist => {
          const { malai, cash } = getTotalsByDate(artist, todayStr);
          return (
            <View key={artist.id} style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <View style={styles.profileRow}>
                  {renderAvatar(artist)}
                  <Text style={styles.adminArtistName}>{artist.name}</Text>
                </View>
                <Text style={styles.adminSummaryText}>🌸 {malai} พวง  |  💰 {cash} บ.</Text>
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

      {/* Pop-up คัดเลือกแม่ยก/ผู้ให้รางวัลดีไซน์หรูหรา */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.luxuryPopupBox}>
            <Text style={styles.luxuryPopupTitle}>✨ บันทึกรายนามผู้ให้รางวัล ✨</Text>
            <View style={styles.vipRow}>
              {vipNames.map((name, index) => (
                <TouchableOpacity key={index} style={styles.vipBtn} onPress={() => confirmTip(name)}>
                  <Text style={styles.vipBtnText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.modalInput} placeholder="✍️ หรือพิมพ์ระบุชื่อใหม่อื่นๆ..." value={customGiverName} onChangeText={setCustomGiverName} placeholderTextColor="#BBB" />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.luxuryCancelBtn} onPress={() => setIsModalVisible(false)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.luxuryConfirmBtn} onPress={() => confirmTip(null)}><Text style={styles.btnText}>👑 บันทึกยอด</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderSummaryScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F5F5FA' }}>
      {renderHeader('บัญชีหลังบ้าน / เคลียร์ยอด')}
      {renderDateSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.leaderCard}>
          <Text style={styles.leaderTitle}>👑 ส่วนแบ่งเข้าคลังรวมประจำวัน</Text>
          <Text style={styles.leaderMoney}>{getLeaderTotalByDate().toLocaleString()} บาท</Text>
          <Text style={styles.leaderSub}>(คำนวณจากยอดมาลัยหักแบ่ง 50% ของวันนี้ทั้งหมด)</Text>
        </View>

        {validArtists.map(artist => {
          const { malai, cash, dayHistory } = getTotalsByDate(artist, viewDateStr);
          const unpaidHistory = dayHistory.filter(h => !h.isPaid);

          if (malai === 0 && cash === 0 && unpaidHistory.length === 0) return null;

          const isSplit = artist.name !== LEADER_NAME && malai >= 10;
          const rate = isSplit ? 10 : 20;

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
                <Text style={{fontWeight: 'bold', color: '#4A148C', marginBottom: 5, fontSize: 13}}>📈 ยอดสรุปทั้งหมดของวันนี้:</Text>
                {artist.name === LEADER_NAME ? (
                  <Text style={styles.sumText}>🌸 มาลัยสะสม {malai} พวง ↳ (หัวหน้ารับเต็ม 100%): <Text style={{fontWeight:'bold', color:'#4A148C'}}>{malai * 20}</Text> บ.</Text>
                ) : (
                  <Text style={styles.sumText}>
                    🌸 มาลัยสะสม {malai} พวง ↳ {malai >= 10 ? `แบ่งเข้าวง 50%: ` : `ศิลปินรับเต็ม 100%: `}
                    <Text style={{fontWeight:'bold', color:'#4A148C'}}>{malai * rate}</Text> บ.
                  </Text>
                )}
                <Text style={styles.sumText}>💰 รางวัลเงินสดสะสม: <Text style={{fontWeight:'bold', color:'#4A148C'}}>{cash.toLocaleString()}</Text> บาท</Text>
                {malai >= 10 && <Text style={styles.sumBonus}>🎉 โบนัสมาลัยแตกประจำวัน: +100 บาท</Text>}
              </View>
              
              <View style={styles.historyBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                   <Text style={styles.historyTitle}>⏳ รายการค้างโอนเงินสด</Text>
                   <Text style={styles.finalPayText}>ยอดโอนรวม: {finalPay.toLocaleString()} บ.</Text>
                </View>

                {unpaidHistory.length === 0 ? (
                  <View style={styles.paidSuccessBanner}>
                    <Text style={{color: '#2E7D32', fontWeight: 'bold', fontSize: 13}}>✅ เคลียร์โอนเงินสดครบหมดแล้ว (ซ่อนการ์ดอัตโนมัติ)</Text>
                  </View>
                ) : (
                  unpaidHistory.map(item => (
                    <TouchableOpacity key={item.id} style={[styles.historyRow, styles.historyPendingBg]} onPress={() => togglePaymentStatus(artist.id, item.id)}>
                      <Text style={styles.historyText} numberOfLines={1}>• {item.text}</Text>
                      <View style={styles.clickToPayBadge}>
                        <Text style={{color: '#FFF', fontSize: 11, fontWeight: 'bold'}}>💸 กดจ่ายเงิน</Text>
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

      {/* Pop-up แก้ไขรูปภาพดีไซน์หรู */}
      <Modal visible={!!editingArtist} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.luxuryPopupBox}>
            <Text style={styles.luxuryPopupTitle}>📸 ปรับเปลี่ยนรูปโปรไฟล์ศิลปิน</Text>
            {editAvatarUrl ? (
              <Image source={{ uri: editAvatarUrl }} style={styles.luxuryAvatarPreview} />
            ) : (
              <View style={styles.luxuryAvatarPlaceholder}><Text style={{color: '#999'}}>ยังไม่มีรูปภาพ</Text></View>
            )}
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}><Text style={styles.uploadBtnText}>เลือกจากคลังรูปภาพมือถือ</Text></TouchableOpacity>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.luxuryCancelBtn} onPress={() => setEditingArtist(null)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={styles.luxuryConfirmBtn} onPress={saveProfileEdit}><Text style={styles.btnText}>อัปเดตข้อมูล</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚨 Pop-up แจ้งเตือนลบข้อมูลทดลองตัวใหม่ (การันตีความสวยงามและกดลบได้ชัวร์ 100%) */}
      <Modal visible={showResetConfirmModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.luxuryPopupBox, {borderColor: '#D32F2F', borderWidth: 2}]}>
            <Text style={[styles.luxuryPopupTitle, {color: '#D32F2F'}]}>⚠️ คำเตือนระบบขั้นเด็ดขาด</Text>
            <Text style={styles.resetModalWarningText}>คุณสนธยาต้องการทำการลบยอดมาลัย รางวัลเงินสด และประวัติทดสอบทั้งหมดในระบบ เพื่อเริ่มเก็บเงินจริงคืนนี้ใช่หรือไม่? ข้อมูลทั้งหมดบนคลาวด์จะหายไปทันที!</Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.luxuryCancelBtn} onPress={() => setShowResetConfirmModal(false)}>
                <Text style={styles.btnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.luxuryConfirmBtn, {backgroundColor: '#D32F2F'}]} onPress={executeResetAllData}>
                <Text style={styles.btnText}>🔥 ยืนยันลบข้อมูล</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pop-up สไลด์เมนูด้านข้างระดับ VIP */}
      <Modal visible={isMenuOpen} transparent={true} animationType="fade">
        <View style={styles.menuOverlay}>
          <View style={styles.menuBoxFull}>
            <Text style={styles.menuMainTitle}>แผงควบคุมระบบ 🎭</Text>
            {role === 'admin' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('dashboard'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>📊 แดชบอร์ดการเงินวง</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('addTip'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>📝 หน้าเวที (บันทึกยอด)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('summary'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>💰 บัญชีหลังบ้าน / โอนเงิน</Text>
                </TouchableOpacity>
                
                {/* ปุ่มลบข้อมูลที่ลิงก์เข้า Pop-up ตัวใหม่ */}
                <TouchableOpacity style={styles.menuResetBtn} onPress={() => { setShowResetConfirmModal(true); }}>
                  <Text style={styles.menuResetBtnText}>🗑️ ล้างข้อมูลทดลอง (เริ่มงานจริง)</Text>
                </TouchableOpacity>
              </>
            )}
            {role === 'artist' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); }}>
                <Text style={styles.menuItemText}>🌟 บอร์ดสรุปยอดศิลปิน</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuLogoutBtn} onPress={logout}>
              <Text style={styles.menuLogoutText}>🚪 ออกจากระบบ</Text>
            </TouchableOpacity>
            <View style={{flex: 1}} />
            <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setIsMenuOpen(false)}><Text style={styles.closeMenuText}>✕ ปิดหน้าต่างเมนู</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- สไตล์การตกแต่งโมเดิร์นคลาสสิก (ม่วง-ทอง หรูหรา ไร้ที่ติ) ---
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3A0F63', padding: 16, paddingTop: Platform.OS === 'ios' ? 45 : 16, elevation: 6, borderBottomWidth: 2, borderBottomColor: '#FFD700' }, 
  hamburgerBtn: { position: 'absolute', left: 12, bottom: 10, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  hamburgerIcon: { fontSize: 26, color: '#FFD700', fontWeight: 'bold' },
  headerTitle: { fontSize: 19, fontStyle: 'normal', fontWeight: 'bold', color: '#FFD700', letterSpacing: 1.2 },
  content: { padding: 14 },
  
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderBottomWidth: 1, borderColor: '#E5E5E5', elevation: 2 },
  dateBtn: { backgroundColor: '#F3E5F5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25, borderWidth: 1, borderColor: '#E1BEE7' },
  dateBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 12 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#3A0F63' },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, marginRight: 14, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FFD700', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28, resizeMode: 'cover' }, 
  
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: '#130526' },
  logoRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginBottom: 25, backgroundColor: '#FFF', overflow: 'hidden', elevation: 10 },
  appLogoImage: { width: '100%', height: '100%', borderRadius: 70 }, 
  appName: { fontSize: 34, fontWeight: '900', color: '#FFD700', marginBottom: 4, letterSpacing: 1 },
  appSubName: { fontSize: 15, color: '#E1BEE7', marginBottom: 50, letterSpacing: 1 },
  
  loginCardAdmin: { backgroundColor: '#3A0F63', width: '100%', paddingVertical: 22, borderRadius: 16, alignItems: 'center', marginBottom: 22, borderWidth: 1.5, borderColor: '#FFD700', elevation: 6 },
  loginCardTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFD700', marginBottom: 4 },
  loginCardSub: { fontSize: 12, color: '#E1BEE7' },
  
  loginCardArtist: { backgroundColor: '#FFF', width: '100%', paddingVertical: 22, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#3A0F63', elevation: 4 },
  artistCardTitle: { fontSize: 19, fontWeight: 'bold', color: '#3A0F63', marginBottom: 4 },
  artistCardSub: { fontSize: 12, color: '#777' },

  // โซนสไตล์ Pop-up (Modal) ดีไซน์พิเศษ VIP
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 4, 32, 0.85)', justifyContent: 'center', padding: 20 },
  luxuryPopupBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, borderWidth: 1.5, borderColor: '#FFD700' },
  luxuryPopupTitle: { fontSize: 21, fontWeight: 'bold', marginBottom: 22, textAlign: 'center', color: '#3A0F63', letterSpacing: 0.5 },
  pinInput: { backgroundColor: '#F5F5FA', fontSize: 34, textAlign: 'center', padding: 14, borderRadius: 14, marginBottom: 24, letterSpacing: 15, color: '#3A0F63', borderWidth: 1.5, borderColor: '#D1C4E9', fontWeight: 'bold' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  luxuryCancelBtn: { backgroundColor: '#757575', padding: 15, borderRadius: 12, flex: 0.47, alignItems: 'center', elevation: 3 },
  luxuryConfirmBtn: { backgroundColor: '#3A0F63', padding: 15, borderRadius: 12, flex: 0.47, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#FFD700' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  artistReadCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  artistReadName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  readDataRow: { flexDirection: 'row' },
  readDataBox: { alignItems: 'center', marginLeft: 16 },
  readDataLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  readDataValue: { fontSize: 18, fontWeight: 'bold' }, 

  infoBanner: { backgroundColor: '#E8EAF6', padding: 14, borderRadius: 10, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#C5CAE9' }, 
  infoBannerText: { color: '#3F51B5', fontWeight: 'bold', fontSize: 14 },
  addNameCompact: { flexDirection: 'row', marginBottom: 16 },
  inputCompact: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDD', fontSize: 15, color: '#333' },
  addBtnCompact: { backgroundColor: '#2E7D32', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 10, marginLeft: 10, elevation: 3 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  
  adminCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#EBEBEB' },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 12, marginBottom: 14 },
  adminArtistName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  adminSummaryText: { fontSize: 15, fontWeight: 'bold', color: '#E91E63' }, 
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  actionLabel: { fontSize: 14, color: '#666', width: 45, fontWeight: 'bold' },
  
  btnSmallMalai: { backgroundColor: '#E91E63', paddingVertical: 11, borderRadius: 8, flex: 0.23, alignItems: 'center', elevation: 2 },
  btnSmallCash: { backgroundColor: '#2E7D32', paddingVertical: 11, borderRadius: 8, flex: 0.23, alignItems: 'center', elevation: 2 },
  btnSmallText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  vipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  vipBtn: { backgroundColor: '#F3E5F5', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1C4E9', width: '31%', marginBottom: 12, alignItems: 'center', elevation: 1 },
  vipBtnText: { color: '#3A0F63', fontWeight: 'bold', fontSize: 13 },
  modalInput: { backgroundColor: '#F5F5FA', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#CCC', marginBottom: 24, fontSize: 16, color: '#333' },

  leaderCard: { backgroundColor: '#3A0F63', padding: 22, borderRadius: 16, marginBottom: 18, alignItems: 'center', elevation: 5, borderWidth: 1, borderColor: '#FFD700' },
  leaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFD700' },
  leaderMoney: { fontSize: 34, fontWeight: 'bold', color: '#FFF', marginVertical: 8 },
  leaderSub: { fontSize: 12, color: '#E1BEE7', textAlign: 'center' },
  summaryCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 3, borderLeftWidth: 6, borderLeftColor: '#3A0F63' },
  artistName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  sumBox: { backgroundColor: '#F5F5FA', padding: 14, borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  sumText: { fontSize: 14, color: '#444', marginBottom: 6 },
  sumBonus: { fontSize: 13, color: '#E91E63', fontWeight: 'bold', marginTop: 4 }, 
  finalPayText: { fontSize: 16, color: '#E91E63', fontWeight: 'bold' },
  historyBox: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#3A0F63' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2' },
  historyText: { fontSize: 14, color: '#333', flex: 1, fontWeight: '700' },
  clickToPayBadge: { backgroundColor: '#3A0F63', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700' },
  paidSuccessBanner: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, alignItems: 'center' },

  // สไตล์สไลด์เมนูด้านข้าง ระดับ VIP
  menuOverlay: { flex: 1, backgroundColor: 'rgba(19, 5, 38, 0.7)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuBoxFull: { width: '82%', maxWidth: 340, height: '100%', backgroundColor: '#FFF', padding: 24, paddingTop: 60, elevation: 20 },
  menuMainTitle: { fontSize: 22, fontWeight: 'bold', color: '#3A0F63', borderBottomWidth: 2, borderBottomColor: '#FFD700', paddingBottom: 12, marginBottom: 25 },
  menuItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  menuItemText: { fontSize: 17, color: '#333', fontWeight: '500' },
  menuResetBtn: { marginTop: 25, backgroundColor: '#FFF3E0', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFB74D' },
  menuResetBtnText: { color: '#E65100', fontWeight: 'bold', fontSize: 15 },
  menuLogoutBtn: { marginTop: 20, backgroundColor: '#FFEBEE', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  menuLogoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  closeMenuBtn: { backgroundColor: '#F5F5FA', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', marginBottom: 20 },
  closeMenuText: { color: '#555', fontSize: 15, fontWeight: 'bold' },
  
  editProfileBtn: { marginTop: 6, backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: '#3A0F63', alignSelf: 'flex-start' },
  editProfileText: { fontSize: 11, color: '#3A0F63', fontWeight: 'bold' },
  luxuryAvatarPreview: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#FFD700' },
  luxuryAvatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEE', alignSelf: 'center', marginBottom: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  uploadBtn: { backgroundColor: '#F3E5F5', padding: 14, borderRadius: 12, marginBottom: 24, alignItems: 'center', borderWidth: 1.5, borderColor: '#D1C4E9' },
  uploadBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 15 },

  // สไตล์หน้าแดชบอร์ดการเงินวงตัวใหม่
  dashboardCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 16, elevation: 4, borderWidth: 1, borderColor: '#EBEBEB' },
  dashTitle: { fontSize: 17, fontWeight: 'bold', color: '#3A0F63', marginBottom: 16 },
  dashDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  dashText: { fontSize: 15, color: '#555' },
  dashValue: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  dashLine: { height: 1.5, backgroundColor: '#F0F0F5', marginVertical: 14 },
  dashHighlight: { fontSize: 17, fontWeight: 'bold', color: '#E91E63', textAlign: 'center' },
  resetModalWarningText: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 24 }
});