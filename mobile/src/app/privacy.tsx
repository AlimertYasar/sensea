import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton, Screen, Txt } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { S, useColors } from '@/lib/theme';

const CONTENT = {
  tr: {
    title: 'Gizlilik',
    blocks: [
      ['Hesap yok', 'Sensea kayıt veya giriş istemez. Adın, stil tercihin ve duygu günlüğün yalnızca bu cihazda saklanır.'],
      ['Yazdıkların', 'Kombin oluşturmak için yazdığın metin, stil tercihin ve (açıksa) hava durumu sunucumuza gönderilir ve yapay zekâ ile işlenir. Metnin sunucuda saklanmaz ve kayıtlara yazılmaz.'],
      ['Yapay zekâ sağlayıcısı', 'Analiz, Anthropic’in Claude modeliyle yapılır. Anthropic, API üzerinden gelen verileri modellerini eğitmek için kullanmaz.'],
      ['Premium özellikler', 'Gerçekçi görsel oluşturduğunda kombin açıklaması (Premium Plus’ta seçili gardırop fotoğrafları da) görseli üretmek için fal.ai’ye gönderilir; görsel doğrudan telefonuna gelir ve bizde saklanmaz. Gardırop fotoğrafların yalnızca bu cihazda durur; tür ve rengini bulmak (Claude API) ve arka planını temizlemek (fal.ai) için gönderildiğinde saklanmaz.'],
      ['Hatırlatmalar', 'Sabah hatırlatması ve haftalık özet bildirimleri yalnızca telefonunda planlanır; hiçbir sunucu üzerinden geçmez. Profilden istediğin an kapatabilirsin.'],
      ['Abonelik', 'Ödemeler App Store veya Google Play üzerinden yapılır; kart bilgilerin bize ulaşmaz. Abonelik durumu RevenueCat ile, yalnızca rastgele uygulama kimliğin kullanılarak doğrulanır.'],
      ['Kullanım istatistikleri ve hata raporları', 'Uygulamayı geliştirmek için yalnızca olay adları (ör. “kombin oluşturuldu”) ve abonelik seviyesi günlük toplam sayı olarak kaydedilir; kimlik, metin ya da içerik kaydedilmez. Uygulama çökerse teknik bir hata raporu (cihaz modeli, işletim sistemi, hata ayrıntısı) Sentry’e gönderilir; yazdıkların ve fotoğrafların bu rapora eklenmez.'],
      ['Konum', 'Hava durumu özelliği açıksa yaklaşık konumun (yaklaşık 10 km hassasiyetle) yalnızca Open-Meteo’dan hava durumu almak için kullanılır. Konumun bizim sunucumuza gönderilmez.'],
      ['Silme', 'Profil > Geçmişi temizle ile tüm kayıtlarını, Gardırop’tan da parçalarını istediğin an silebilirsin. Uygulamayı kaldırmak da tüm verileri siler.'],
      ['Sağlık uyarısı', 'Sensea bir stil asistanıdır; tıbbi ya da psikolojik destek yerine geçmez.'],
    ],
  },
  en: {
    title: 'Privacy',
    blocks: [
      ['No account', 'Sensea doesn’t ask you to sign up. Your name, style preference and mood journal are stored only on this device.'],
      ['What you write', 'To create an outfit, your text, your style preference and (if enabled) the weather are sent to our server and processed by AI. Your text is not stored on the server and is not logged.'],
      ['AI provider', 'Analysis is done with Anthropic’s Claude model. Anthropic does not use data sent through its API to train its models.'],
      ['Premium features', 'When you create a realistic image, the outfit description (and, on Premium Plus, the selected wardrobe photos) is sent to fal.ai to generate it; the image comes straight to your phone and is not stored by us. Your wardrobe photos stay on this device; when sent to detect type and colour (Claude API) and to remove the background (fal.ai), they are not stored.'],
      ['Reminders', 'Morning reminders and weekly summary notifications are scheduled on your phone only and never go through a server. Turn them off any time in Profile.'],
      ['Subscriptions', 'Payments go through the App Store or Google Play; we never see your card details. Subscription status is verified with RevenueCat using only your random app identifier.'],
      ['Usage statistics and crash reports', 'To improve the app, only event names (e.g. “outfit created”) and subscription tier are stored as daily totals; no identifiers, text or content are recorded. If the app crashes, a technical report (device model, OS, error details) is sent to Sentry; your text and photos are never included.'],
      ['Location', 'If weather is on, your approximate location (about 10 km precision) is used only to get the weather from Open-Meteo. It is never sent to our server.'],
      ['Deleting', 'Use Profile > Clear history to delete all your entries, and remove wardrobe pieces from the Wardrobe tab, at any time. Uninstalling the app also removes all data.'],
      ['Health notice', 'Sensea is a style assistant and is not a substitute for medical or psychological support.'],
    ],
  },
};

export default function Privacy() {
  const C = useColors();
  const c = CONTENT[useLocale()];
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: S.sm }}>
        <IconButton icon="x" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <Txt v="h1" accessibilityRole="header">
        {c.title}
      </Txt>
      {c.blocks.map(([h, b]) => (
        <View key={h} style={{ marginTop: S.xl }}>
          <Txt v="h3">{h}</Txt>
          <Txt v="body" color={C.textDim} style={{ marginTop: 6 }}>
            {b}
          </Txt>
        </View>
      ))}
    </Screen>
  );
}
