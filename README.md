# Autobus i kolorowe autka

Spokojna gra dla małego dziecka. Żółty autobus puszcza kolorowe kulki, autka kręcą się i zamieniają w konfetti. Każde trafienie daje gwiazdkę, a co pięć gwiazdek pojawia się krótka celebracja. Nie ma przegranej, kar ani limitu czasu.

## Uruchomienie

Kliknij dwukrotnie **index.html**, aby otworzyć grę w aktualnej przeglądarce (np. Edge, Chrome lub Firefox). Następnie kliknij **Graj** albo naciśnij **Enter** lub **spację**. Nie potrzeba internetu, serwera, instalacji ani budowania projektu. Wszystkie cztery pliki trzymaj w jednym folderze.

## Sterowanie

- **↑ / ↓** — jeden pas w górę / w dół na jedno naciśnięcie.
- **Spacja** — kolorowa kulka. Przytrzymaj, aby strzelać regularnie; jednocześnie możesz zmieniać pasy.
- **P** — pauza / wznowienie. Na ekranie pauzy działają też Enter, spacja i przycisk.
- **Dźwięk** — włącza / wyłącza ciche efekty, bez muzyki.
- **Auto-strzał** — po włączeniu wystarczą same strzałki; domyślnie wyłączony.
- **Poziom** — wybór w panelu rodzica, dostępny przed startem, podczas gry i na pauzie.
- **Pełny ekran** — przełącza widok, jeśli przeglądarka na to pozwala; Esc go opuszcza.

Po opuszczeniu okna lub zakładki gra sama przechodzi na pauzę. Wznów ją świadomie, gdy wrócisz. Pominięte autka i zderzenia nie zabierają gwiazdek. Brak obsługi dźwięku lub pełnego ekranu nie blokuje zabawy. Gra jest przeznaczona głównie na komputer z klawiaturą.

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

Najważniejsze parametry są opisane w obiekcie `CONFIG` na początku `game.js`, w tym trzy zestawy ustawień w `CONFIG.levels` oraz odstępy i rozmiary pachołków. Grafiki powstają w kodzie, a dźwięki są syntezowane dopiero po interakcji użytkownika. Ustawienia i gwiazdki dotyczą bieżącej sesji; odświeżenie strony rozpoczyna nową zabawę i przywraca Spokojną jazdę.
