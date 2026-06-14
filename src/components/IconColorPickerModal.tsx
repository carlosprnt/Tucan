import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HABIT_ICON_SUGGESTIONS } from '@/lib/icons';
import { haptics } from '@/lib/haptics';

interface EmojiItem {
  char: string;
  kw: string;
}

// Curated emoji set, each with search keywords so the search box matches them
// by name/synonyms (not just by category). Grouped loosely for nice browsing.
const EMOJI_DATA: [string, string][] = [
  // Faces & people
  ['😀', 'grin smile happy face'],
  ['😃', 'smile happy face joy'],
  ['😄', 'smile happy laugh face'],
  ['😁', 'grin beam happy face'],
  ['😆', 'laugh haha happy face'],
  ['😅', 'sweat laugh relief face'],
  ['🤣', 'rofl laugh funny face'],
  ['😂', 'joy laugh cry funny face'],
  ['🙂', 'slight smile face'],
  ['😉', 'wink flirt face'],
  ['😊', 'blush smile happy face'],
  ['😇', 'angel halo innocent face'],
  ['🥰', 'love hearts adore face'],
  ['😍', 'love heart eyes face'],
  ['🤩', 'star struck wow face'],
  ['😘', 'kiss love face'],
  ['😋', 'yum tasty food face'],
  ['😛', 'tongue silly face'],
  ['😜', 'wink tongue silly face'],
  ['🤪', 'crazy zany goofy face'],
  ['😎', 'cool sunglasses face'],
  ['🥳', 'party celebrate birthday face'],
  ['😌', 'relieved calm content face'],
  ['😴', 'sleep sleepy tired zzz face'],
  ['🤔', 'think thinking hmm face'],
  ['😢', 'cry sad tear face'],
  ['😭', 'cry sob sad face'],
  ['😤', 'huff angry steam face'],
  ['😠', 'angry mad face'],
  ['😡', 'rage angry mad face'],
  ['🤯', 'mind blown shock face'],
  ['🥶', 'cold freeze face'],
  ['🤒', 'sick ill thermometer face'],
  ['😈', 'devil evil smile face'],
  ['💀', 'skull dead death'],
  ['🤡', 'clown face'],
  ['👻', 'ghost boo spooky'],
  ['👽', 'alien ufo space'],
  ['🤖', 'robot bot machine'],
  // Hands & body
  ['👋', 'wave hi hello hand'],
  ['👌', 'ok perfect hand'],
  ['✌️', 'peace victory hand'],
  ['🤞', 'fingers crossed luck hand'],
  ['🤟', 'love you hand'],
  ['🤙', 'call me shaka hand'],
  ['👍', 'thumbs up like good hand'],
  ['👎', 'thumbs down dislike bad hand'],
  ['✊', 'fist power hand'],
  ['👊', 'punch fist bump hand'],
  ['👏', 'clap applause hands'],
  ['🙌', 'raise hands celebrate praise'],
  ['🙏', 'pray please thanks hands'],
  ['🤝', 'handshake deal agree'],
  ['💪', 'muscle strong flex arm gym'],
  ['🧠', 'brain mind smart think'],
  ['👀', 'eyes look see watch'],
  // Hearts & symbols
  ['❤️', 'heart love red'],
  ['🧡', 'orange heart love'],
  ['💛', 'yellow heart love'],
  ['💚', 'green heart love'],
  ['💙', 'blue heart love'],
  ['💜', 'purple heart love'],
  ['🖤', 'black heart love'],
  ['🤍', 'white heart love'],
  ['💔', 'broken heart sad love'],
  ['💕', 'two hearts love'],
  ['💖', 'sparkle heart love'],
  ['⭐', 'star favorite'],
  ['🌟', 'glowing star sparkle shine'],
  ['✨', 'sparkles shine magic'],
  ['⚡', 'lightning bolt energy power fast'],
  ['🔥', 'fire flame hot lit streak'],
  ['💧', 'water drop droplet'],
  ['🌈', 'rainbow color'],
  ['☀️', 'sun sunny weather'],
  ['🌙', 'moon night sleep'],
  ['❄️', 'snow snowflake cold winter'],
  ['💎', 'diamond gem jewel premium'],
  ['👑', 'crown king queen royal'],
  ['🏆', 'trophy win award champion'],
  ['🥇', 'gold medal first win'],
  ['🎯', 'target dart goal aim bullseye'],
  ['🎁', 'gift present birthday'],
  ['🎉', 'party tada celebrate'],
  // Animals & nature
  ['🐶', 'dog puppy pet animal'],
  ['🐱', 'cat kitten pet animal'],
  ['🐭', 'mouse animal'],
  ['🐰', 'rabbit bunny animal'],
  ['🦊', 'fox animal'],
  ['🐻', 'bear animal'],
  ['🐼', 'panda animal'],
  ['🐨', 'koala animal'],
  ['🦁', 'lion animal'],
  ['🐯', 'tiger animal'],
  ['🐮', 'cow animal'],
  ['🐷', 'pig animal'],
  ['🐸', 'frog animal'],
  ['🐵', 'monkey animal'],
  ['🐔', 'chicken hen animal'],
  ['🐧', 'penguin animal'],
  ['🐦', 'bird animal'],
  ['🦄', 'unicorn animal magic'],
  ['🐝', 'bee honey animal'],
  ['🦋', 'butterfly animal'],
  ['🐢', 'turtle tortoise animal slow'],
  ['🐍', 'snake animal'],
  ['🐙', 'octopus animal'],
  ['🐠', 'fish tropical animal'],
  ['🐬', 'dolphin animal sea'],
  ['🐳', 'whale animal sea'],
  ['🌱', 'seedling plant grow sprout'],
  ['🌲', 'tree evergreen nature'],
  ['🌳', 'tree nature'],
  ['🍀', 'clover luck four leaf'],
  ['🌸', 'blossom flower spring'],
  ['🌹', 'rose flower love'],
  ['🌻', 'sunflower flower'],
  // Food & drink
  ['🍎', 'apple fruit food healthy'],
  ['🍌', 'banana fruit food'],
  ['🍓', 'strawberry fruit food'],
  ['🍇', 'grapes fruit food'],
  ['🥑', 'avocado food healthy'],
  ['🥦', 'broccoli vegetable food healthy'],
  ['🥕', 'carrot vegetable food healthy'],
  ['🍅', 'tomato food'],
  ['🍞', 'bread food'],
  ['🥚', 'egg food protein'],
  ['🍗', 'chicken meat food protein'],
  ['🍔', 'burger food fast'],
  ['🍕', 'pizza food'],
  ['🥗', 'salad food healthy'],
  ['🍣', 'sushi food'],
  ['🍰', 'cake dessert sweet'],
  ['🎂', 'birthday cake dessert'],
  ['🍫', 'chocolate sweet candy'],
  ['🍿', 'popcorn movie snack'],
  ['🍯', 'honey sweet'],
  ['🥛', 'milk drink glass'],
  ['💧', 'water hydrate drink'],
  ['☕', 'coffee tea drink cup'],
  ['🍵', 'tea matcha drink cup'],
  ['🍷', 'wine drink alcohol'],
  ['🍺', 'beer drink alcohol'],
  // Activity & sport
  ['⚽', 'soccer football ball sport'],
  ['🏀', 'basketball ball sport'],
  ['🏈', 'football ball sport'],
  ['⚾', 'baseball ball sport'],
  ['🎾', 'tennis ball sport'],
  ['🏐', 'volleyball ball sport'],
  ['🏓', 'ping pong table tennis sport'],
  ['🥊', 'boxing glove fight sport'],
  ['🏋️', 'gym lift weights workout sport strong'],
  ['🤸', 'gymnastics cartwheel sport'],
  ['🧘', 'yoga meditate calm zen'],
  ['🏄', 'surf surfing sport'],
  ['🏊', 'swim swimming pool sport'],
  ['🚴', 'cycle bike biking sport'],
  ['🚵', 'mountain bike cycle sport'],
  ['🏃', 'run running jog sport exercise'],
  ['🚶', 'walk walking steps'],
  ['⛳', 'golf flag sport'],
  // Travel & places
  ['🚗', 'car drive vehicle travel'],
  ['🚕', 'taxi cab car travel'],
  ['🏍️', 'motorcycle bike travel'],
  ['🚲', 'bicycle bike cycle travel'],
  ['✈️', 'plane flight travel fly'],
  ['🚀', 'rocket launch space fast'],
  ['⛵', 'sailboat boat sea travel'],
  ['🚆', 'train travel commute'],
  ['🏠', 'house home'],
  ['🏢', 'office building work'],
  ['🗺️', 'map travel explore'],
  ['🧭', 'compass direction navigate'],
  // Objects & work
  ['📱', 'phone mobile device'],
  ['💻', 'laptop computer work'],
  ['⌨️', 'keyboard type work'],
  ['🖥️', 'desktop computer monitor'],
  ['🎥', 'camera movie film video'],
  ['📷', 'camera photo picture'],
  ['🎮', 'game controller play gaming'],
  ['🎧', 'headphones music audio listen'],
  ['🎵', 'music note song'],
  ['🎸', 'guitar music instrument'],
  ['🎹', 'piano keyboard music instrument'],
  ['🥁', 'drums music instrument'],
  ['🎨', 'art paint palette draw creative'],
  ['✏️', 'pencil write draw edit'],
  ['🖊️', 'pen write'],
  ['📝', 'memo note write journal'],
  ['📖', 'book read open study'],
  ['📚', 'books read study library'],
  ['📅', 'calendar date schedule plan'],
  ['📈', 'chart graph growth progress'],
  ['📊', 'bar chart graph stats data'],
  ['💰', 'money bag cash save finance'],
  ['💵', 'money cash dollar finance'],
  ['💳', 'credit card payment money'],
  ['💡', 'idea bulb light think'],
  ['🔋', 'battery energy charge'],
  ['🔧', 'wrench tool fix repair'],
  ['🔨', 'hammer tool build'],
  ['🧹', 'broom clean chores sweep'],
  ['🧴', 'lotion soap skincare bottle'],
  ['🚿', 'shower bath clean wash'],
  ['🛏️', 'bed sleep rest'],
  ['💊', 'pill medicine meds vitamin health'],
  ['🦷', 'tooth teeth brush dental'],
  ['⏰', 'alarm clock time wake'],
  ['⌚', 'watch time clock'],
  ['📞', 'phone call ring'],
  ['🔑', 'key unlock'],
  ['🎬', 'movie clapper film'],
  ['🧩', 'puzzle piece game'],
  // More faces & people
  ['🤗', 'hug face'],
  ['🤓', 'nerd glasses study face'],
  ['🥹', 'tears happy face'],
  ['🙃', 'upside down silly face'],
  ['🤤', 'drool face'],
  ['😷', 'mask sick face'],
  ['🤠', 'cowboy face'],
  ['🫡', 'salute respect face'],
  ['🫶', 'heart hands love'],
  ['🙋', 'raise hand question'],
  ['🧑‍🍳', 'cook chef kitchen'],
  ['🧑‍💻', 'code developer work laptop'],
  ['🧑‍🎓', 'student graduate study'],
  ['🧑‍🏫', 'teacher class'],
  ['👶', 'baby child'],
  ['🤰', 'pregnant baby'],
  ['🧗', 'climb climbing sport'],
  ['🧖', 'sauna spa relax'],
  ['💆', 'massage relax spa'],
  ['🛀', 'bath relax clean'],
  ['🚣', 'row rowing boat sport'],
  ['🤾', 'handball sport'],
  // More hands & body
  ['🫰', 'finger heart love'],
  ['🤌', 'pinch italian hand'],
  ['✋', 'hand stop high five'],
  ['👐', 'open hands'],
  ['🦶', 'foot step'],
  ['🦵', 'leg'],
  ['👂', 'ear listen hear'],
  ['👅', 'tongue taste'],
  ['🦴', 'bone'],
  ['🫀', 'heart organ cardio'],
  ['🫁', 'lungs breath breathe'],
  // More animals
  ['🐺', 'wolf animal'],
  ['🐴', 'horse animal'],
  ['🦓', 'zebra animal'],
  ['🦒', 'giraffe animal'],
  ['🐘', 'elephant animal'],
  ['🐑', 'sheep animal'],
  ['🐐', 'goat animal'],
  ['🦌', 'deer animal'],
  ['🦅', 'eagle bird animal'],
  ['🦉', 'owl bird animal night'],
  ['🐟', 'fish animal'],
  ['🦈', 'shark animal sea'],
  ['🦀', 'crab animal'],
  ['🐌', 'snail slow animal'],
  ['🐞', 'ladybug bug animal'],
  ['🐜', 'ant bug animal'],
  ['🕷️', 'spider bug animal'],
  // More plants, nature & weather
  ['🌷', 'tulip flower spring'],
  ['🌼', 'daisy flower'],
  ['🌵', 'cactus plant'],
  ['🌴', 'palm tree tropical'],
  ['🍂', 'autumn leaves fall'],
  ['🍁', 'maple leaf autumn'],
  ['🍄', 'mushroom'],
  ['🌾', 'wheat grain harvest'],
  ['🪴', 'potted plant grow'],
  ['🌊', 'wave ocean sea water'],
  ['🏔️', 'mountain peak snow'],
  ['🌋', 'volcano'],
  ['🏕️', 'camp camping tent outdoors'],
  ['🏖️', 'beach vacation'],
  ['🌅', 'sunrise morning'],
  ['🌠', 'shooting star wish'],
  ['☁️', 'cloud weather'],
  ['🌧️', 'rain weather'],
  ['⛈️', 'storm thunder weather'],
  ['🌬️', 'wind weather breeze'],
  ['🌡️', 'thermometer temperature weather'],
  ['🌍', 'earth world globe planet'],
  // More food & drink
  ['🍊', 'orange fruit food'],
  ['🍋', 'lemon fruit food'],
  ['🍉', 'watermelon fruit food'],
  ['🍑', 'peach fruit food'],
  ['🍒', 'cherries fruit food'],
  ['🥝', 'kiwi fruit food'],
  ['🍍', 'pineapple fruit food'],
  ['🥥', 'coconut fruit food'],
  ['🌽', 'corn vegetable food'],
  ['🥒', 'cucumber vegetable food'],
  ['🌶️', 'pepper spicy chili food'],
  ['🥔', 'potato food'],
  ['🥜', 'peanuts nuts food'],
  ['🥐', 'croissant bread food'],
  ['🧀', 'cheese food'],
  ['🥩', 'steak meat protein food'],
  ['🍳', 'fried egg breakfast food'],
  ['🥞', 'pancakes breakfast food'],
  ['🌮', 'taco food'],
  ['🌯', 'burrito food'],
  ['🍜', 'ramen noodles soup food'],
  ['🍲', 'stew soup food'],
  ['🍱', 'bento lunch food'],
  ['🍚', 'rice food'],
  ['🍦', 'ice cream dessert sweet'],
  ['🍩', 'donut sweet dessert'],
  ['🍪', 'cookie sweet snack'],
  ['🍬', 'candy sweet'],
  ['🥤', 'soda drink cup straw'],
  ['🧃', 'juice box drink'],
  ['🧋', 'bubble tea boba drink'],
  ['🥂', 'cheers champagne celebrate'],
  ['🥃', 'whiskey drink alcohol'],
  ['🍸', 'cocktail drink alcohol'],
  ['💦', 'sweat droplets water'],
  // More activity & sport
  ['🏸', 'badminton sport'],
  ['🏑', 'field hockey sport'],
  ['🏒', 'ice hockey sport'],
  ['🥏', 'frisbee disc sport'],
  ['🎳', 'bowling sport'],
  ['🏹', 'archery bow sport aim'],
  ['🎣', 'fishing sport'],
  ['🤺', 'fencing sport'],
  ['🥋', 'martial arts karate judo sport'],
  ['⛸️', 'ice skating sport'],
  ['🎿', 'ski skiing winter sport'],
  ['🏂', 'snowboard winter sport'],
  ['🛹', 'skateboard sport'],
  ['🛼', 'roller skate sport'],
  ['🤹', 'juggle skill'],
  ['🥅', 'goal net sport'],
  ['🪀', 'yoyo play'],
  // More travel & places
  ['🚌', 'bus travel commute'],
  ['🚑', 'ambulance emergency'],
  ['🚓', 'police car'],
  ['🛵', 'scooter moped travel'],
  ['🛴', 'kick scooter travel'],
  ['🚇', 'metro subway commute'],
  ['🚁', 'helicopter fly travel'],
  ['🚢', 'ship cruise sea travel'],
  ['⚓', 'anchor boat sea'],
  ['🏝️', 'island beach vacation'],
  ['🏞️', 'park nature outdoors'],
  ['🏟️', 'stadium sport'],
  ['🏥', 'hospital health'],
  ['🏦', 'bank money'],
  ['🏨', 'hotel travel'],
  ['🏫', 'school study'],
  ['⛪', 'church'],
  ['🏰', 'castle'],
  ['⛺', 'tent camp'],
  ['🌆', 'city skyline evening'],
  // More objects & misc
  ['📺', 'tv television watch'],
  ['⏱️', 'stopwatch timer time'],
  ['⏳', 'hourglass time wait'],
  ['📌', 'pin note'],
  ['📎', 'paperclip'],
  ['✂️', 'scissors cut'],
  ['📏', 'ruler measure'],
  ['🔍', 'search magnify find'],
  ['🔒', 'lock secure'],
  ['🔔', 'bell notification reminder'],
  ['📢', 'megaphone announce loud'],
  ['🔦', 'flashlight light'],
  ['🕯️', 'candle calm light'],
  ['🛒', 'cart shopping shop'],
  ['🎒', 'backpack school bag'],
  ['👟', 'sneaker shoe run'],
  ['👕', 'shirt clothes laundry'],
  ['🧦', 'socks clothes'],
  ['🧢', 'cap hat'],
  ['🕶️', 'sunglasses cool'],
  ['🧰', 'toolbox tools fix'],
  ['🪙', 'coin money'],
  ['💶', 'euro money cash'],
  ['🪥', 'toothbrush teeth dental'],
  ['🧼', 'soap clean wash'],
  ['🧽', 'sponge clean'],
  ['🧺', 'laundry basket clothes'],
  ['🪣', 'bucket clean'],
  ['🛁', 'bathtub bath relax'],
  ['🪞', 'mirror'],
  ['🪑', 'chair sit'],
  ['🛋️', 'couch sofa rest'],
  ['🚪', 'door'],
  ['🧸', 'teddy bear toy'],
  // More symbols
  ['✅', 'check done complete tick'],
  ['☑️', 'checkbox checked done'],
  ['✔️', 'check tick done'],
  ['➕', 'plus add'],
  ['♻️', 'recycle eco green'],
  ['☮️', 'peace'],
  ['☯️', 'yin yang balance zen'],
  ['⚛️', 'atom science physics'],
  ['🧬', 'dna biology science'],
  ['🔬', 'microscope science lab'],
  ['🔭', 'telescope astronomy stars'],
  ['🧪', 'test tube chemistry lab'],
  ['♾️', 'infinity forever'],
  ['🎗️', 'ribbon awareness'],
  ['🏅', 'medal award win'],
  ['🥈', 'silver medal second'],
  ['🥉', 'bronze medal third'],
  ['🎲', 'dice game luck'],
  ['🧿', 'evil eye protect amulet'],
  ['🔮', 'crystal ball magic future'],
  // More music & art
  ['🎤', 'mic sing karaoke'],
  ['🎻', 'violin music instrument'],
  ['🎺', 'trumpet music instrument'],
  ['🩰', 'ballet dance'],
  ['🧶', 'yarn knit craft'],
  ['🧵', 'thread sew craft'],
  ['🎭', 'theater drama masks'],
  ['🎟️', 'ticket event'],
];

const EMOJIS: EmojiItem[] = EMOJI_DATA.map(([char, kw]) => ({ char, kw }));

// Icons: the same SF Symbols we surface as quick-select in the form.
const ICONS = HABIT_ICON_SUGGESTIONS;

type Tab = 'emojis' | 'icons';

interface IconColorPickerModalProps {
  visible: boolean;
  currentIcon: SFSymbol | string;
  onSelect: (icon: SFSymbol | string) => void;
  onClose: () => void;
}

export function IconColorPickerModal({
  visible,
  currentIcon,
  onSelect,
  onClose,
}: IconColorPickerModalProps) {
  const { theme } = useUnistyles();
  // Initialized from the form's current icon. The parent remounts this via a
  // `key` each time it opens, so these pick up the latest selection and land on
  // the matching tab — keeping the icon previewed/highlighted.
  const [selectedIcon, setSelectedIcon] = useState<SFSymbol | string>(currentIcon);
  const [tab, setTab] = useState<Tab>(() =>
    /\p{Extended_Pictographic}/u.test(currentIcon) ? 'emojis' : 'icons',
  );
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const isEmoji = /\p{Extended_Pictographic}/u.test(selectedIcon);

  const filteredEmojis = q
    ? EMOJIS.filter((e) => e.kw.includes(q) || e.char === search.trim())
    : EMOJIS;
  const filteredIcons = q
    ? ICONS.filter((i) => i.label.toLowerCase().includes(q) || i.key.includes(q))
    : ICONS;

  const handleConfirm = () => {
    haptics.success();
    onSelect(selectedIcon);
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const switchTab = (t: Tab) => {
    haptics.selection();
    setSearch('');
    setTab(t);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.closeButton}>Cancel</Text>
          </Pressable>
          <View style={styles.preview}>
            {isEmoji ? (
              <Text style={styles.emojiPreview}>{selectedIcon}</Text>
            ) : (
              <SymbolView
                name={selectedIcon as SFSymbol}
                size={30}
                tintColor={theme.colors.textPrimary}
              />
            )}
          </View>
          <Pressable onPress={handleConfirm} hitSlop={12}>
            <Text style={styles.confirmButton}>Select</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['emojis', 'icons'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => switchTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'emojis' ? 'Emojis' : 'Icons'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SymbolView name="magnifyingglass" size={16} tintColor={theme.colors.textMuted} />
          <TextInput
            placeholder={tab === 'emojis' ? 'Search emojis' : 'Search icons'}
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Grid */}
        {tab === 'emojis' ? (
          <FlatList
            key="emojis"
            data={filteredEmojis}
            numColumns={7}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            keyExtractor={(item) => item.char}
            renderItem={({ item }) => {
              const selected = item.char === selectedIcon;
              return (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setSelectedIcon(item.char);
                  }}
                  style={[styles.emojiCell, selected && styles.cellSelected]}>
                  <Text style={styles.emoji}>{item.char}</Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <FlatList
            key="icons"
            data={filteredIcons}
            numColumns={6}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const selected = item.key === selectedIcon;
              return (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setSelectedIcon(item.key);
                  }}
                  style={[styles.iconCell, selected && styles.cellSelected]}>
                  <SymbolView
                    name={item.key}
                    size={24}
                    tintColor={theme.colors.textPrimary}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPreview: {
    fontSize: 30,
  },
  closeButton: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    gap: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xs,
  },
  tab: {
    paddingVertical: theme.space.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.textPrimary,
  },
  tabLabel: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginHorizontal: theme.space.lg,
    marginTop: theme.space.md,
    paddingHorizontal: theme.space.md,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.body,
    padding: 0,
  },
  gridContent: {
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: theme.space.xs,
    marginBottom: theme.space.sm,
  },
  emojiCell: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  iconCell: {
    width: '14%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  cellSelected: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
  },
  emoji: {
    fontSize: 26,
  },
}));
