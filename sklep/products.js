window.SHOP_PRODUCTS = [
  {
    id: 'tshirt-men',
    slug: 't-shirt-meski-classic',
    name: 'T-shirt klasyczny ExploRide męski',
    price: 89,
    summary: 'Wygodny krój, nadruk ExploRide i dostępne rozmiary S–XXL.',
    description:
      'Wygodny krój, logo na froncie oraz z tyłu i kod QR na prawym rękawie',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    imageAlt: 'Wizualizacja koszulki męskiej ExploRide',
    imagePlaceholder: 'Placeholder zdjęcia',
    imageCaption:
      '',
    note: 'Dostępność i terminy wysyłki zostaną potwierdzone po złożeniu zamówienia przez formularz.',
  },
  {
    id: 'tshirt-women',
    slug: 't-shirt-damski-classic',
    name: 'T-shirt klasyczny ExploRide damski',
    price: 89,
    summary: 'Dopasowana koszulka z logotypem – idealna na wyjazdy i eksploracje.',
    description: 'Dopasowany krój, lekka bawełna i logo ExploRide – wygoda w kobiecym wydaniu.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://exploride.pl/sklep/photos/tshirt-exploride-classic.jpg',
    imageAlt: 'Wizualizacja koszulki damskiej ExploRide',
    imagePlaceholder: 'Placeholder zdjęcia',
    imageCaption:
      'Przykładowa wizualizacja koszulki – finalne zdjęcia pojawią się po dostawie.',
    note: 'Dostępność i terminy wysyłki zostaną potwierdzone po złożeniu zamówienia przez formularz.',
  },
  {
    id: 'calendar-2026',
    slug: 'kalendarz-2026',
    name: 'Kalendarz ExploRide Urbex 2026',
    price: 69,
    summary: '12 kadrów z wypraw urbexowych na każdy miesiąc kolejnego sezonu.',
    description:
      'Kalendarz ścienny z fotografiami z eksploracji. Każdy miesiąc to inny klimat i nowa historia.',
    sizes: [],
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
// 3. (Opcjonalnie) podaj ścieżkę do zdjęcia w polu "image" lub zostaw puste, aby wyświetlić placeholder.
// 4. Zapisz plik i dodaj stronę produktu jako kopię istniejącej (np. t-shirt-meski-classic.html) z nowym slugiem.
