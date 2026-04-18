import iconArt from '../assets/wishlist-icons/art.png';
import iconBalloon from '../assets/wishlist-icons/balloon.png';
import iconBasic from '../assets/wishlist-icons/basic.png';
import iconBirthday from '../assets/wishlist-icons/birthday.png';
import iconBook from '../assets/wishlist-icons/book.png';
import iconCarnival from '../assets/wishlist-icons/carnival.png';
import iconGame from '../assets/wishlist-icons/game.png';
import iconGift from '../assets/wishlist-icons/gift.png';
import iconHalloween from '../assets/wishlist-icons/halloween.png';
import iconHeart from '../assets/wishlist-icons/heart.png';
import iconHome from '../assets/wishlist-icons/home.png';
import iconMusic from '../assets/wishlist-icons/music.png';
import iconNewyear from '../assets/wishlist-icons/newyear.png';
import iconParty from '../assets/wishlist-icons/party.png';
import iconSport from '../assets/wishlist-icons/sport.png';
import iconStar from '../assets/wishlist-icons/star.png';
import iconStudy from '../assets/wishlist-icons/study.png';
import iconTravel from '../assets/wishlist-icons/travel.png';
import iconValentine from '../assets/wishlist-icons/valentine.png';
import iconWedding from '../assets/wishlist-icons/wedding.png';
import iconWork from '../assets/wishlist-icons/work.png';

const wishlistIconUrlByCode = {
  basic: iconBasic,
  birthday: iconBirthday,
  newyear: iconNewyear,
  valentine: iconValentine,
  wedding: iconWedding,
  party: iconParty,
  gift: iconGift,
  balloon: iconBalloon,
  heart: iconHeart,
  star: iconStar,
  halloween: iconHalloween,
  carnival: iconCarnival,
  book: iconBook,
  art: iconArt,
  sport: iconSport,
  travel: iconTravel,
  music: iconMusic,
  home: iconHome,
  work: iconWork,
  game: iconGame,
  study: iconStudy,
};

export function getWishlistIconUrl(iconCode) {
  const key = String(iconCode || 'basic').toLowerCase();
  return wishlistIconUrlByCode[key] || wishlistIconUrlByCode.basic;
}

export const wishlistIconOptions = [
  { code: 'basic', label: 'Обычный' },
  { code: 'birthday', label: 'День рождения' },
  { code: 'newyear', label: 'Новый год' },
  { code: 'valentine', label: 'День влюблённых' },
  { code: 'wedding', label: 'Свадьба' },
  { code: 'party', label: 'Вечеринка' },
  { code: 'gift', label: 'Подарок' },
  { code: 'balloon', label: 'Шарик' },
  { code: 'heart', label: 'Сердце' },
  { code: 'star', label: 'Звезда' },
  { code: 'halloween', label: 'Хэллоуин' },
  { code: 'carnival', label: 'Карнавал' },
  { code: 'book', label: 'Книги' },
  { code: 'art', label: 'Искусство' },
  { code: 'sport', label: 'Спорт' },
  { code: 'travel', label: 'Путешествия' },
  { code: 'music', label: 'Музыка' },
  { code: 'home', label: 'Дом' },
  { code: 'work', label: 'Работа' },
  { code: 'game', label: 'Игры' },
  { code: 'study', label: 'Учёба' },
];
