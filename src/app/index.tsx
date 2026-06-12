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

// รายชื่อตั้งต้น
const initialArtistsList = ['สนธยา', 'โก๊ะ', 'ต่อ', 'พ่อดอกไม้', 'เจมส์', 'น้องพีพี', 'เอม', 'กิ๊ก', 'แม่นัท', 'ซูซู'];
const defaultArtists = initialArtistsList.map((name, index) => ({
  id: 'artist_' + index, name: name, malai: 0, cash: 0, history: [], avatar: ''
}));

export default function App() {
  const LEADER_NAME = "สนธยา";
  const ADMIN_PIN = "1234"; 

  const [role, setRole] = useState(null); 
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [artists, setArtists] = useState(defaultArtists);
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

  // ☁️ โหลดข้อมูลจาก Supabase 
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('likay_state').select('data').eq('id', 1).single();
    if (data && data.data && data.data.length > 0) {
      setArtists(data.data);
    }
  };

  // ☁️ เซฟข้อมูลลง Supabase
  const saveDataToCloud = async (newData) => {
    setArtists(newData);
    await supabase.from('likay_state').update({ data: newData }).eq('id', 1);
  };

  const changeDay = (days) => {
    const newDate = new Date(currentDateObj);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDateObj(newDate);
  };

  const getTotalsByDate = (artist, targetDateStr) => {
    let malai = 0; let cash = 0;
    const dayHistory = artist.history.filter(h => h.date === targetDateStr);
    dayHistory.forEach(item => {
      if (item.type === 'malai') malai += item.amount;
      if (item.type === 'cash') cash += item.amount;
    });
    return { malai, cash, dayHistory };
  };

  const handleAdminLogin = () => {
    if (pinInput === ADMIN_PIN) {
      setRole('admin'); setCurrentScreen('addTip'); setShowPinModal(false); setPinInput('');
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
      const updatedArtists = [...artists, { id: Date.now().toString(), name: newArtistName, history: [], avatar: '' }];
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

    const updatedArtists = artists.map(artist => {
      if (artist.id === id) {
        let logMsg = type === 'malai' ? `🌸 ${finalName} ให้ ${amount} พวง` : `💰 ${finalName} ให้ ${amount} บ.`;
        const newHistoryItem = { id: Date.now().toString(), type, amount, text: logMsg, isPaid: false, date: todayStr };
        return { ...artist, history: [newHistoryItem, ...artist.history] };
      }
      return artist;
    });
    saveDataToCloud(updatedArtists);
    setIsModalVisible(false);
  };

  const togglePaymentStatus = (artistId, historyId) => {
    const updatedArtists = artists.map(artist => {
      if (artist.id === artistId) {
        return { ...artist, history: artist.history.map(item => item.id === historyId ? { ...item, isPaid: !item.isPaid } : item) };
      }
      return artist;
    });
    saveDataToCloud(updatedArtists);
  };

  // 🖼️ เลือกรูปจากเครื่อง
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.3,   
      base64: true,
    });

    if (!result.canceled) {
      const imageBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditAvatarUrl(imageBase64);
    }
  };

  const saveProfileEdit = () => {
    const updatedArtists = artists.map(artist => 
      artist.id === editingArtist.id ? { ...artist, avatar: editAvatarUrl } : artist
    );
    saveDataToCloud(updatedArtists);
    setEditingArtist(null);
  };

  const getLeaderTotalByDate = () => {
    let total = 0;
    artists.forEach(artist => {
      const { malai } = getTotalsByDate(artist, viewDateStr);
      total += (malai * 20) / 2;
    });
    return total;
  };

  // --- UI Components ---
 const renderHeader = (title) => (
    <View style={[styles.header, { zIndex: 999 }]}>
      {role ? (
        <TouchableOpacity 
          onPress={() => setIsMenuOpen(true)} 
          style={{ padding: 15, zIndex: 1000, marginLeft: -5 }} 
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 50 }} />}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 50 }} />
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
        resizeMode="cover"
      />
    </View>
  );

  // --- 📱 หน้าจอ 0: เลือกสถานะ (Login) ---
  const renderLoginScreen = () => (
    <View style={styles.loginContainer}>
      <View style={styles.logoRing}>
        <Image source={require('../../assets/images/profile.jpg')} style={styles.appLogoImage} />
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

  // --- 📱 หน้าจอ 1: เช็กยอดสำหรับศิลปิน ---
  const renderArtistScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {renderHeader('บอร์ดสรุปยอดศิลปิน')}
      {renderDateSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {artists.map(artist => {
          const { malai, cash } = getTotalsByDate(artist, viewDateStr);
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
                  <Text style={styles.readDataLabel}>🌸 มาลัย (พวง)</Text>
                  <Text style={[styles.readDataValue, {color: '#E91E63'}]}>{malai}</Text>
                </View>
                <View style={styles.readDataBox}>
                  <Text style={styles.readDataLabel}>💰 รางวัลสด</Text>
                  <Text style={[styles.readDataValue, {color: '#2E7D32'}]}>{cash}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );

  // --- 📱 หน้าจอ 2: บันทึกรายได้ (Admin) ---
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

        {artists.map(artist => {
          const { malai, cash, dayHistory } = getTotalsByDate(artist, todayStr);
          return (
            <View key={artist.id} style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <View style={styles.profileRow}>
                  {renderAvatar(artist)}
                  <View>
                    <Text style={styles.adminArtistName}>{artist.name}</Text>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => { setEditingArtist(artist); setEditAvatarUrl(artist.avatar); }}>
                      <Text style={styles.editProfileText}>✏️ เปลี่ยนรูป</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.adminSummaryText}>🌸 {malai}  |  💰 {cash}</Text>
              </View>
              
              <View style={styles.actionRow}>
                <Text style={styles.actionLabel}>มาลัย</Text>
                {[5, 10, 15, 20].map(num => (
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

              {dayHistory.length > 0 && (
                <View style={styles.miniLog}>
                  <Text style={styles.miniLogText} numberOfLines={1}>ล่าสุด: {dayHistory[0].text}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{height: 40}} />
      </ScrollView>

      {/* Popup ถามชื่อผู้ให้ */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ใครเป็นคนให้?</Text>
            <View style={styles.vipRow}>
              {vipNames.map((name, index) => (
                <TouchableOpacity key={index} style={styles.vipBtn} onPress={() => confirmTip(name)}>
                  <Text style={styles.vipBtnText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.modalInput} placeholder="หรือพิมพ์ชื่อใหม่ที่นี่..." value={customGiverName} onChangeText={setCustomGiverName} />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#4A148C'}]} onPress={() => confirmTip(null)}><Text style={styles.btnText}>บันทึกยอด</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  // --- 📱 หน้าจอ 3: สรุปบัญชี (Admin) ---
  const renderSummaryScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {renderHeader('บัญชีหลังบ้าน')}
      {renderDateSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.leaderCard}>
          <Text style={styles.leaderTitle}>👑 ส่วนแบ่งหัวหน้า ประจำวันที่ {viewDateStr}</Text>
          <Text style={styles.leaderMoney}>{getLeaderTotalByDate()} บาท</Text>
          <Text style={styles.leaderSub}>(หักจากยอดมาลัย 50% ของวันนี้)</Text>
        </View>

        {artists.map(artist => {
          const { malai, cash, dayHistory } = getTotalsByDate(artist, viewDateStr);
          if (malai === 0 && cash === 0 && dayHistory.length === 0) return null;

          const malaiMoney = malai * 20; 
          const artistMalaiShare = malaiMoney / 2; 
          const bonus = malai >= 10 ? 100 : 0; 
          const finalPay = artistMalaiShare + cash + bonus; 

          return (
            <View key={artist.id} style={styles.summaryCard}>
              <View style={styles.profileRow}>
                {renderAvatar(artist)}
                <Text style={styles.artistName}>🌟 {artist.name}</Text>
              </View>
              
              <View style={styles.sumBox}>
                <Text style={styles.sumText}>🌸 มาลัย {malai} พวง ({malaiMoney} บ.) ↳ แบ่งศิลปิน: <Text style={{fontWeight:'bold', color:'#333'}}>{artistMalaiShare}</Text> บ.</Text>
                <Text style={styles.sumText}>💰 รางวัลสด (รับเต็ม): <Text style={{fontWeight:'bold', color:'#333'}}>{cash}</Text> บ.</Text>
                {bonus > 0 && <Text style={styles.sumBonus}>🎉 โบนัสมาลัย: +{bonus} บ.</Text>}
              </View>
              
              <Text style={styles.finalPayText}>ยอดโอนสุทธิ: {finalPay} บาท</Text>

              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>รายการของวันนี้ (กดเพื่อติ๊กจ่ายแล้ว)</Text>
                {dayHistory.length === 0 ? <Text style={styles.historyText}>- ไม่มีรายการ -</Text> : 
                  dayHistory.map(item => (
                    <TouchableOpacity key={item.id} style={[styles.historyRow, item.isPaid ? styles.historyPaidBg : styles.historyPendingBg]} onPress={() => togglePaymentStatus(artist.id, item.id)}>
                      <Text style={[styles.historyText, item.isPaid && styles.historyTextPaid]} numberOfLines={1}>• {item.text}</Text>
                      <Text style={[styles.statusBadge, item.isPaid ? styles.badgePaid : styles.badgePending]}>{item.isPaid ? '✅ จ่ายแล้ว' : '⏳ รอโอน'}</Text>
                    </TouchableOpacity>
                  ))
                }
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
      {currentScreen === 'artistView' && renderArtistScreen()}
      {currentScreen === 'addTip' && renderAddTipScreen()}
      {currentScreen === 'summary' && renderSummaryScreen()}

      {/* Modal แก้ไขรูปโปรไฟล์ */}
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

            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Text style={styles.uploadBtnText}>📸 เปิดอัลบั้มรูปภาพ</Text>
            </TouchableOpacity>
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingArtist(null)}><Text style={styles.btnText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#4A148C'}]} onPress={saveProfileEdit}><Text style={styles.btnText}>อัปเดตข้อมูล</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal เมนู */}
      <Modal visible={isMenuOpen} transparent={true} animationType="fade">
        <View style={styles.menuOverlay}>
          <View style={styles.menuBoxFull}>
            <Text style={[styles.menuTitle, {fontSize: 24, marginBottom: 40}]}>เมนูระบบ 🎭</Text>
            {role === 'admin' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('addTip'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>📝 ไปหน้าเวที (บันทึกยอด)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('summary'); setIsMenuOpen(false); }}>
                  <Text style={styles.menuItemText}>💰 ไปหลังบ้าน (สรุปบัญชี)</Text>
                </TouchableOpacity>
              </>
            )}
            {role === 'artist' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); }}>
                <Text style={styles.menuItemText}>🌟 บอร์ดศิลปิน</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0, marginTop: 40, backgroundColor: '#FFEBEE', borderRadius: 10}]} onPress={logout}>
              <Text style={[styles.menuItemText, {color: '#D32F2F', fontWeight: 'bold', textAlign: 'center'}]}>🚪 ออกจากระบบ</Text>
            </TouchableOpacity>
            
            <View style={{flex: 1}} />
            <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setIsMenuOpen(false)}>
              <Text style={styles.closeMenuText}>✕ ปิดหน้าต่าง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- ตกแต่งความสวยงาม UI (High-Contrast Elegant Theme) ---
const styles = StyleSheet.create({
  // โทนสีหลัก: ม่วงเข้ม (#4A148C), สีรอง: ทอง (#FFD700), พื้นหลัง: ขาว/เทาอ่อน
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4A148C', padding: 15, paddingTop: Platform.OS === 'ios' ? 45 : 15, elevation: 5 }, 
  hamburgerBtn: { padding: 5 },
  hamburgerIcon: { fontSize: 28, color: '#FFD700' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  content: { padding: 12 },
  
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
  dateBtn: { backgroundColor: '#F3E5F5', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  dateBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 12 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#EEE', borderWidth: 2, borderColor: '#FFD700', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' }, 
  
  // Login Screen (สีเข้มหรูหรา)
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

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  pinInput: { backgroundColor: '#F9F9F9', fontSize: 32, textAlign: 'center', padding: 15, borderRadius: 10, marginBottom: 25, letterSpacing: 15, color: '#4A148C', borderWidth: 1, borderColor: '#DDD' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { backgroundColor: '#9E9E9E', padding: 14, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#4A148C', padding: 14, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Cards
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
  
  // ปรับสีปุ่มให้เห็นชัดเจนไม่หลงแน่นอน
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
  sumText: { fontSize: 14, color: '#555', marginBottom: 6 },
  sumBonus: { fontSize: 14, color: '#E91E63', fontWeight: 'bold', marginTop: 4 }, 
  finalPayText: { fontSize: 18, color: '#2E7D32', fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  historyBox: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#4A148C', marginBottom: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 6, marginBottom: 6 },
  historyPendingBg: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2' },
  historyPaidBg: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  historyText: { fontSize: 13, color: '#333', flex: 1 },
  historyTextPaid: { color: '#999', textDecorationLine: 'line-through' },
  statusBadge: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  badgePending: { color: '#E65100' },
  badgePaid: { color: '#2E7D32' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuBoxFull: { width: '80%', maxWidth: 350, height: '100%', backgroundColor: '#FFF', padding: 25, paddingTop: 60, elevation: 15 },
  menuTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A148C' },
  menuItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  menuItemText: { fontSize: 18, color: '#333' },
  closeMenuBtn: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', marginBottom: 20 },
  closeMenuText: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  
  editProfileBtn: { marginTop: 6, backgroundColor: '#F5F5F5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: '#DDD', alignSelf: 'flex-start' },
  editProfileText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  
  uploadBtn: { backgroundColor: '#F3E5F5', padding: 15, borderRadius: 10, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#CE93D8' },
  uploadBtnText: { color: '#4A148C', fontWeight: 'bold', fontSize: 16 }
});