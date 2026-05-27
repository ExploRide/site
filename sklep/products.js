window.SHOP_PRODUCTS = [
  {
    id: 'tshirt-men',
    slug: 't-shirt-meski-classic',
    name: 'T-shirt klasyczny ExploRide męski',
    price: 45,
    summary: 'Wygodny krój, nadruk ExploRide i dostępne rozmiary S–XXL.',
    description:
      'Wygodny krój, logo na froncie oraz z tyłu i kod QR na prawym rękawie',
    longDescription: [
      'Nadruk: DTF',
      'Gramatura: 150 g/m²',
      'Rozmiary: XS, S, M, L, XL, XXL',
      'Skład materiału: bawełna (100%)',
      'Rodzaj materiału: jersey',
      'Processing: szwy boczne',
      'Pielęgnacja: pranie do 40°C',
      'Certyfikaty: Fair Working Conditions',
      'OEKO-TEX® STANDARD 100',
      'Vegan',
      'Kolorystyka: czarna',
      'Krój: slim',
      'Dekolt: taśma wzmacniająca, okrągły',
      'Rękawy: krótki, wszyty (set in)',
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    images: [
      'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    'https://exploride.pl/sklep/photos/KOSZULKA CZARNA EXPLORIDE NEW.pdf',
     'https://exploride.pl/sklep/photos/thirtclassicmodel.png'
    ],
    image: 'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    imageAlt: 'Wizualizacja koszulki męskiej ExploRide',
    imagePlaceholder: 'Placeholder zdjęcia',
    imageCaption: '',
    note: 'Dostępność i terminy wysyłki zostaną potwierdzone po złożeniu zamówienia przez formularz.',
  },
  {
    id: 'tshirt-women',
    slug: 't-shirt-damski-classic',
    name: 'T-shirt klasyczny ExploRide damski',
    price: 45,
    summary: 'Dopasowana koszulka z logotypem – idealna na wyjazdy i eksploracje.',
    description: 'Dopasowany krój, lekka bawełna i logo ExploRide – wygoda w kobiecym wydaniu.',
    longDescription: [
      'Nadruk: DTF',
      'Gramatura: 150 g/m²',
      'Rozmiary: XS, S, M, L, XL, XXL',
      'Skład materiału: bawełna (100%)',
      'Rodzaj materiału: jersey',
      'Processing: szwy boczne',
      'Pielęgnacja: pranie do 40°C',
      'Certyfikaty: Fair Working Conditions',
      'OEKO-TEX® STANDARD 100',
      'Vegan',
      'Kolorystyka: czarna',
      'Krój: slim',
      'Dekolt: taśma wzmacniająca, okrągły',
      'Rękawy: krótki, wszyty (set in)',
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    images: [
       'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    'https://exploride.pl/sklep/photos/KOSZULKA CZARNA EXPLORIDE NEW.pdf',
     'https://exploride.pl/sklep/photos/thirtclassicmodelbaba.png'
    ],
    image: 'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    imageAlt: 'Wizualizacja koszulki damskiej ExploRide',
    imagePlaceholder: 'Placeholder zdjęcia',
    imageCaption: 'Przykładowa wizualizacja koszulki – finalne zdjęcia pojawią się po dostawie.',
    note: 'Dostępność i terminy wysyłki zostaną potwierdzone po złożeniu zamówienia przez formularz.',
  },
  {
    id: 'calendar-2026',
    slug: 'kalendarz-2026',
    name: 'Kalendarz ExploRide Urbex 2026',
    price: 35,
    summary: '12 kadrów z wypraw urbexowych na każdy miesiąc.',
    description:
      'Kalendarz ścienny A4, ze spiralą na środku z autorskimi zdjęciami z opuszczonych. Umieściliśmy tam też opisy miejsc widocznych na zdjęciach oraz nietypowe święta i wydarzenia, które nawiązują do urbexu, historii i zabytków.',
    sizes: [],
    images: [
  'https://exploride.pl/sklep/photos/kalendarz2026-1.jpg',
  'https://exploride.pl/sklep/photos/kalendarz2026-2.jpg',
    ],
    image: '',
    imageAlt: 'Okładka kalendarza ExploRide Urbex 2026',
    imagePlaceholder: 'Okładka kalendarza',
    imageCaption: 'Mocny urbexowy klimat na każdy miesiąc nadchodzącego roku.',
    note: 'Wysyłka po potwierdzeniu dostępności – informacja w podsumowaniu zamówienia.',
  },
];

// Jak dodać nowy produkt?
// 1. Skopiuj jeden z powyższych obiektów i nadaj mu unikalne id oraz slug.
// 2. Uzupełnij nazwę, cenę, opis i ewentualne rozmiary.
// 3. (Opcjonalnie) Dodaj tablicę longDescription ze szczegółowym opisem – każdy element to nowa linia na stronie produktu.
// 4. (Opcjonalnie) podaj ścieżkę do zdjęcia w polu "image" lub zostaw puste, aby wyświetlić placeholder.
// 5. Zapisz plik i dodaj stronę produktu jako kopię istniejącej (np. t-shirt-meski-classic.html) z nowym slugiem.
