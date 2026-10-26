# Autobus i kolorowe autka

Spokojna gra dla małego dziecka. Żółty autobus puszcza kolorowe kulki, autka kręcą się i zamieniają w konfetti. Każde trafienie daje gwiazdkę, a co pięć gwiazdek pojawia się krótka celebracja. Nie ma przegranej, kar ani limitu czasu.

## Uruchomienie

Kliknij dwukrotnie **index.html**, aby otworzyć grę w aktualnej przeglądarce (np. Edge, Chrome lub Firefox). Następnie kliknij **Graj** albo naciśnij **Enter** lub **spację**. Nie potrzeba internetu, serwera, instalacji ani budowania projektu. Pliki gry oraz foldery `pojazdy_600px` i `music` trzymaj razem, zachowując nazwy grafik i utworów.

## Sterowanie

- **↑ / ↓** — jeden pas w górę / w dół na jedno naciśnięcie.
- **Spacja** — kolorowa kulka. Przytrzymaj, aby strzelać regularnie; jednocześnie możesz zmieniać pasy.
- **P** — pauza / wznowienie. Na ekranie pauzy działają też Enter, spacja i przycisk.
- **Dźwięk** — włącza / wyłącza efekty oraz muzykę w tle.
- **Auto-strzał** — po włączeniu wystarczą same strzałki; domyślnie wyłączony.
- **Poziom** — wybór w panelu rodzica, dostępny przed startem, podczas gry i na pauzie.
- **Pełny ekran** — przełącza widok, jeśli przeglądarka na to pozwala; Esc go opuszcza.

### Telefon i tablet

Na urządzeniach dotykowych pod planszą pojawiają się trzy duże przyciski: **↑**, **↓** i **kolorowa kulka**. Dotknięcie strzałki zmienia pas tylko raz; dotknięcie kulki strzela, a jej przytrzymanie uruchamia regularny ostrzał. Można jednocześnie trzymać kulkę jednym palcem i zmieniać pas drugim. Po włączeniu auto-strzału wystarczą strzałki.

Najwygodniej grać z telefonem w poziomie; układ pionowy również działa. Przyciski nie przewijają ani nie powiększają strony. Puszczenie przycisku, anulowanie dotyku lub opuszczenie okna przerywa dotykowy ostrzał. Obrócenie telefonu włącza pauzę; dotknij „Jedziemy dalej”, aby wznowić. Na komputerze z ekranem dotykowym można korzystać z przycisków i klawiatury równocześnie.

Po opuszczeniu okna lub zakładki gra sama przechodzi na pauzę. Wznów ją świadomie, gdy wrócisz. Pominięte autka i zderzenia nie zabierają gwiazdek. Brak obsługi dźwięku lub pełnego ekranu nie blokuje zabawy.

## Poziomy trudności

| Poziom | Maksymalnie autek | Prędkość autek | Pachołki |
| --- | --- | --- | --- |
| Spokojna jazda (domyślny) | 2 | podstawowa | brak |
| Wesoły ruch | 3 | o 25% większa | brak |
| Małe wyzwanie | 4 | o 50% większa | pojedyncze |

Na wyższych poziomach autka pojawiają się częściej. Poziom pozostaje stały do następnego wyboru rodzica. Zmiana poziomu zachowuje gwiazdki i auto-strzał, usuwa dotychczasowe pojazdy oraz pachołek i daje chwilę na przygotowanie. Nie wznawia samoczynnie pauzy.

Na poziomie **Małe wyzwanie** omijaj pomarańczowe pachołki strzałkami. Pachołki stoją nieruchomo względem drogi: przesuwają się na ekranie razem z jej oznaczeniami, wolniej niż autka. Kulki przelatują nad nimi, a wjechanie w pachołek powoduje odbicie i klakson, bez utraty gwiazdek. Pachołek pojawia się z prawej strony, jest najwyżej jeden naraz, a sąsiedni pas pozostaje wolny od autek na czas jego przejazdu. Jeśli pas jest zajęty, gra czeka z pojawieniem się pachołka. Po zniknięciu pachołka jest co najmniej 9 sekund przerwy przed następnym.

## Pliki i ustawienia

- `index.html` — interfejs i klasyczne dołączenie skryptu.
- `style.css` — wygląd i skalowanie planszy.
- `game.js` — rysowanie Canvas 2D, zasady, animacje i Web Audio API.
- `music/` — podkład MP3: `Curious Bounce.mp3`, następnie `Sunny Journey.mp3`, odtwarzane na zmianę w pętli. Muzyka zaczyna się po rozpoczęciu gry, zatrzymuje na pauzie i po wyłączeniu dźwięku, a po wznowieniu kontynuuje od tego samego miejsca. Głośność podkładu ustawia `CONFIG.musicVolume` (od `0` do `1`), domyślnie `0.35`.
- `pojazdy_600px/` — przezroczyste grafiki PNG: autobus gracza i 11 losowanych pojazdów. Wszystkie pliki źródłowe są skierowane w prawo; gra odbija nadjeżdżające pojazdy lustrzanie w poziomie, kierując je w lewo i zachowując górę, dół oraz proporcje obrazów.

### Rozmiar poszczególnych pojazdów

Na początku `game.js` znajduje się `VEHICLE_SCALES` z osobnym wpisem dla każdej z 12 grafik. Wartość `1` zachowuje obecny rozmiar, `1.2` powiększa grafikę o 20%, a `0.8` pomniejsza o 20%. Używaj dodatnich liczb z kropką dziesiętną. Na przykład `"01_ciezarowka": 1.3` powiększa tylko ciężarówkę o 30%. Po zapisaniu pliku odśwież grę.

Skala zmienia wyłącznie wygląd, zachowuje proporcje i łączy się z animacją obrotu oraz zmniejszania po trafieniu. Dotyczy także grafiki zastępczej przy braku pliku. Rozmiary kolizji pozostają określone przez `busWidth`, `busHeight`, `carWidth` i `carHeight` w `CONFIG`; duże powiększenie grafiki może więc sprawić, że jej krawędzie znajdą się poza obszarem kolizji.

Najważniejsze parametry są opisane w obiekcie `CONFIG` na początku `game.js`, w tym trzy zestawy ustawień w `CONFIG.levels` oraz odstępy i rozmiary pachołków. Pojazdy korzystają z plików PNG, pozostała grafika powstaje w kodzie, a dźwięki są syntezowane dopiero po interakcji użytkownika. Jeśli grafika pojazdu nie jest jeszcze załadowana lub brakuje pliku, gra rysuje zastępczy pojazd. Ustawienia i gwiazdki dotyczą bieżącej sesji; odświeżenie strony rozpoczyna nową zabawę i przywraca Spokojną jazdę.
