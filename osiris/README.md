# Osiris Deck Builder Premium 🪄

Osiris ya no es solo una página web, se ha convertido en una auténtica estación de trabajo inmersiva y profesional para cualquier constructor de mazos de Magic: The Gathering.

## Lo que se ha implementado (Novedades Nivel 6)

### 🖨️ 1. Creador de Proxies (Impresión Física)
- Hemos cruzado la barrera digital. En tu mazo, ahora tienes un botón con un icono de **Impresora**.
- Al pulsarlo, Osiris elimina temporalmente toda la interfaz de la web y genera una hoja blanca con todas las cartas de tu mazo alineadas.
- **Lo mejor:** Las cartas se redimensionan automáticamente mediante CSS a **63x88mm** (el tamaño exacto oficial de MTG). Solo tienes que darle a imprimir, recortar, meter en fundas y jugar físicamente.

### ⭐ 2. Carpeta de Cambios (Trade Binder)
- Cada carta en tu inventario tiene ahora un pequeño icono de estrella.
- Si lo pulsas, la estrella se vuelve dorada (✨) y la carta queda marcada como "Disponible para Cambio".
- En la barra de filtros principal he añadido un botón especial de Estrella. Púlsalo para que la pantalla solo muestre tu material de cambio. Ideal para enseñárselo a otros jugadores en la tienda de cómics desde el móvil.

### ⚔️ 3. Fuerza Militar (Combat Stats)
- En el panel de estadísticas de tu mazo, verás una nueva línea: **Fuerza Militar (Total)**.
- Osiris suma matemáticamente el Poder y la Resistencia (P/T) de todas las criaturas de tu ejército.
- Genial para saber de un vistazo el potencial destructivo bruto de mazos enfocados en atacar (Aggro) o en generar fichas (Tokens).

---

## Novedades Nivel 5 (Premium y Visión)

### ✨ 1. Cartas Holográficas (Efecto Foil 3D)
- Todas las cartas de tu inventario y de tu mazo ahora tienen un efecto Premium.
- Cuando pases el cursor del ratón por encima de cualquier carta, verás cómo un **brillo metálico dinámico** cruza la imagen de esquina a esquina, emulando el reflejo de la luz sobre una carta Foil de la vida real.

### 🌈 2. Análisis del Balance de Colores
- Justo debajo del validador de Commander en la barra lateral, tienes un nuevo gráfico: **Balance de Colores**.
- Esta barrita se divide en porcentajes precisos calculando cuántas cartas llevas de cada color de maná (Blanco, Azul, Negro, Rojo, Verde) basándose en sus costes reales.
- Es la herramienta definitiva para saber exactamente cómo construir tu base de tierras (ej. si la barra es 60% Roja y 40% Verde, ya sabes qué tierras meter).

### 🔍 3. Filtro Avanzado por Tipos
- En la barra de filtros principal de la colección, al lado de la ordenación, he añadido un menú desplegable de Tipos.
- Ahora puedes filtrar instantáneamente tu colección o tu mazo para ver solo tus "Planeswalkers", tus "Artefactos" o tus "Criaturas".

---

## Novedades Nivel 4 (Inmersión y Competición)

### 🎵 1. Radio Osiris (Inmersión Total)
- En la barra superior, a la derecha de la barra de búsqueda, verás un nuevo botón con el icono de una nota musical.
- **Púlsalo** y empezará a sonar un tema de música ambiental oscuro y épico (Dark Ambient Fantasy), diseñado para ponerte en situación mientras piensas en qué cartas añadir a tu mazo.
- El botón empezará a brillar y palpitar al ritmo suave de la música. Si necesitas concentración en silencio, simplemente vuelve a pulsarlo para pausar la radio.

### 🛡️ 2. Validador de Formato (Commander)
- Si eres jugador de Commander, esto te salvará la vida. Justo en la barra lateral, debajo del valor de tu mazo y la curva de maná, ha aparecido un **indicador de legalidad**.
- Osiris analiza en tiempo real tu mazo y te avisará si es legal o ilegal basándose en dos reglas de oro:
  - ¿Tienes **exactamente 100 cartas**?
  - ¿Has respetado la **regla Singleton** (solo 1 copia por carta)? No te preocupes, el sistema es listo y permite añadir tantas "Island", "Mountain" o tierras nevadas básicas como quieras sin dar error.
- Si todo está correcto, el indicador se pondrá en verde brillante con un escudo de verificación. Si falla algo, se pondrá en rojo y te dirá exactamente qué norma estás rompiendo.

### 📋 3. Exportar Mazo a Texto
- En la cabecera de la sección de tu mazo, al lado del botón de "Ver Cuadrícula" (el de los cuadraditos), tienes ahora un nuevo **botón de "Copiar"**.
- Al hacer clic, Osiris transformará todas las cartas de tu mazo a un formato de texto limpio (ej: `1 Sol Ring`, `20 Island`) y lo **copiará al portapapeles** de tu ordenador.
- Listo para pegar en un mensaje de WhatsApp a tus colegas, en un foro o en otra plataforma como Moxfield. El icono cambiará a un tick verde para confirmarte que se ha copiado con éxito.

---

## El Arsenal Completo de Osiris (Resumen)

1. **Diseño Premium**: Tema oscuro con *glassmorphism* y orbes mágicos flotantes. Pantalla de Bienvenida épica.
2. **Construcción Inteligente**: El sistema almacena solo una copia en memoria y le asigna una "cantidad", ahorrando recursos. Extrae el **Oracle Text**, Fuerza/Resistencia y Tipos directamente de los servidores de Scryfall.
3. **Modal de Detalles**: Ventanas emergentes de cristal al hacer clic en las cartas para leer todo cómodamente.
4. **Importación Masiva**: Pega listas enteras de texto y Osiris descargará todas las cartas en lotes.
5. **Vista Visual del Mazo (Grid View)**: Transforma la lista lateral en una galería visual en el centro de la pantalla.
6. **Estadísticas Pro**: Distribución gráfica de la Curva de Maná y contadores visuales por Tipo de Carta (Criaturas, Tierras, etc.).
7. **Simulador de Mano (Mulligan)**: Comprueba qué tal roba tu mazo con una simulación aleatoria de 7 cartas usando barajado de la vida real.
8. **Copias de Seguridad (JSON)**: Exporta e importa toda tu colección y todos tus mazos mediante archivos para no perderlos nunca.
