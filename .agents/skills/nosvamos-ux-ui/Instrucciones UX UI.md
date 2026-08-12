Quiero que a partir de ahora uses estas reglas de UX/UI en NosVamos.

## Objetivo visual

La aplicación debe tener una estética:

- minimalista
- oscura
- moderna
- inspirada en aplicaciones nativas de iPhone
- limpia
- compacta
- con buena jerarquía visual
- sin apariencia de interfaz generada por IA

No quiero que todo esté metido dentro de cards.

Usá cards solamente cuando realmente ayuden a separar una entidad importante, como:

- una reserva
- un vuelo
- un alojamiento
- un ticket
- un documento
- un resumen importante

Para listas, actividades, opciones, configuraciones y datos simples, preferí:

- filas
- separadores
- jerarquía tipográfica
- espacios
- agrupaciones
- timelines
- bottom sheets

antes que cards.

---

# Paleta oficial

Usá estos colores como fuente de verdad.

## Base

- Fondo principal: `#25272C`
- Fondo exterior: `#1E2024`
- Surface: `#303238`
- Raised: `#383B42`

## Identidad principal

- Sky Mint: `#B8F7E4`
- Mint Deep: `#8EDCC5`

## Texto

- Texto principal: `#F5F8F6`
- Texto secundario: `#AEB5B2`

## Separadores

```css
rgba(184, 247, 228, 0.12)
```

## Categorías

- Vuelos y transporte: `#A78BFA`
- Comidas y experiencias: `#FF9B82`
- Alojamientos e información: `#7DD3FC`
- Eventos y recordatorios: `#F7C873`

## Estados destructivos

- Destructive: `#E73535`
- Soft error: `#FF7777`

No inventes nuevos colores de acento sin una necesidad concreta.

---

# Menú principal

El menú principal actual de NosVamos ya define parte de la identidad visual.

NO lo rediseñes.

Mantené:

- colores
- disposición
- tamaños
- iconos
- estados activos
- estados inactivos
- espaciado
- comportamiento

Si necesitás usar el mismo patrón en otra parte, reutilizá los componentes existentes.

---

# Botón + y menú desplegable

El botón `+` actual también es parte central del diseño.

Debe conservar:

```text
Fondo: #B8F7E4
Icono: #25272C
```

No cambies:

- forma
- tamaño
- ubicación
- animación
- menú desplegable
- colores
- estilo de las opciones

Antes de crear cualquier nuevo floating action button o menú de acciones, buscá el componente existente y reutilizalo.

---

# Sistema de botones

No todos los elementos interactivos tienen que parecer botones tradicionales.

En particular, evitá llenar las pantallas de rectángulos redondeados.

## Primary button

Usalo para la acción principal de una pantalla.

Ejemplos:

- Guardar
- Continuar
- Crear viaje
- Confirmar
- Agregar reserva

Estilo:

```css
background: #B8F7E4;
color: #25272C;
```

Pressed:

```css
background: #8EDCC5;
```

Disabled:

```css
background: rgba(184,247,228,0.20);
color: rgba(245,248,246,0.35);
```

Idealmente no debe haber más de un Primary Button dominante en el mismo contexto.

---

# Secondary button

Para acciones importantes pero secundarias.

```css
background: #383B42;
color: #F5F8F6;
```

Borde opcional muy sutil:

```css
border: 1px solid rgba(184,247,228,0.08);
```

No debe competir visualmente con el Primary.

---

# Tertiary / Ghost button

Usalo mucho.

Es importante para mantener una interfaz minimalista estilo iOS.

Estilo:

```css
background: transparent;
color: #B8F7E4;
```

Pressed:

```css
background: rgba(184,247,228,0.08);
```

Ejemplos:

```text
Editar
Ver detalles
Cambiar fecha
Agregar actividad
Ver reserva
```

No metas estas acciones dentro de botones sólidos salvo que exista una razón UX.

---

# Outline button

Solo cuando haga falta una acción alternativa visualmente delimitada.

```css
background: transparent;
color: #F5F8F6;
border: 1px solid rgba(184,247,228,0.18);
```

No usar outline simplemente por decoración.

---

# Destructive actions

En una pantalla normal, una acción destructiva debería ser discreta.

Ejemplo:

```text
Eliminar viaje
```

Estilo:

```css
background: transparent;
color: #FF7777;
```

Cuando el usuario confirma una acción realmente destructiva, ahí sí puede usarse:

```css
background: #E73535;
color: #FFFFFF;
```

No llenar la interfaz de botones rojos.

---

# Colores de categorías

Los colores de categoría sirven para identificar contenido.

NO usarlos como sistema principal de botones.

No hacer:

```text
Agregar vuelo -> botón violeta
Agregar hotel -> botón celeste
Agregar comida -> botón naranja
Agregar evento -> botón amarillo
```

Las acciones principales deben continuar usando Mint.

Los colores de categoría pueden usarse de forma pequeña en:

- iconos
- puntos
- indicadores
- línea lateral
- timeline
- pequeños labels
- estados
- elementos gráficos discretos

Ejemplo:

```text
● Vuelo
  AF471
  Buenos Aires → París
```

El indicador puede usar:

```text
#A78BFA
```

pero el resto de la interfaz sigue usando la paleta principal.

Regla conceptual:

```text
Mint = interacción
Colores de categorías = significado
```

---

# Cards

No crear automáticamente una card para cada elemento.

Antes de crear una card preguntate:

```text
¿Este contenido necesita realmente estar visualmente separado del resto?
```

Si no, no uses card.

Preferí:

```text
Título

09:30
Schönbrunn Palace
Entrada guardada
──────────────────────

13:00
Almuerzo
Figlmüller
──────────────────────

16:20
Tren a Bratislava
Wien Hbf → Bratislava
```

en lugar de:

```text
[ Card actividad ]

[ Card comida ]

[ Card tren ]
```

Evitar especialmente:

- cards dentro de cards
- `rounded-2xl` en todos lados
- `rounded-3xl` en todos lados
- sombras grandes
- tarjetas flotantes sin necesidad

---

# Listas estilo iPhone

Para contenido repetitivo, preferí filas compactas.

Ejemplo:

```text
Hotel
Hilton Vienna Plaza
8–11 septiembre                         >

────────────────────────────────────────

Vuelo
AF471 · Air France
08:45 → 11:20                           >

────────────────────────────────────────

Tren
Wien Hbf → Salzburg Hbf
14:28                                   >
```

Usá:

- padding consistente
- tipografía clara
- separadores sutiles
- chevron cuando corresponda
- información secundaria en `#AEB5B2`

---

# Tipografía

Usar preferentemente:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Segoe UI",
  sans-serif;
```

No incluir fuentes propietarias de Apple dentro del proyecto.

Escala recomendada aproximada:

```text
Título de pantalla: 28–34px
Título de sección: 18–22px
Contenido principal: 16–17px
Texto secundario: 14–15px
Metadata: 12–13px
```

No usar títulos gigantes estilo landing page.

---

# Bordes y radios

Usar radios moderados.

Orientación:

```text
Botones: 8–12px
Inputs: 8–12px
Cards: 12–16px
Bottom sheets: 16–24px arriba
```

No usar pill shape salvo que el elemento realmente sea:

- chip
- tag
- filtro
- selector
- estado

---

# Sombras

Usar muy pocas sombras.

Preferí:

- separadores
- fondos
- contraste
- overlays

antes que sombras.

Si una sombra es necesaria, que sea muy sutil.

---

# Transiciones entre pantallas

La navegación debe sentirse como una aplicación de iPhone.

## Navegar hacia una pantalla más profunda

Usar una transición horizontal:

```text
Pantalla actual:
ligero desplazamiento hacia la izquierda

Pantalla nueva:
entra desde la derecha
```

Duración:

```text
250–350ms
```

Easing recomendado:

```css
cubic-bezier(0.32, 0.72, 0, 1)
```

No usar animaciones exageradas.

---

# Volver atrás

La transición debe ser inversa.

La pantalla actual sale hacia la derecha y aparece la anterior desde la izquierda.

Mantener la posición de scroll anterior cuando sea posible.

---

# Menú principal / tabs

Al cambiar entre las secciones principales de la aplicación NO hacer grandes slides horizontales.

Usar:

- cambio inmediato
- fade muy sutil
- pequeño desplazamiento

Duración aproximada:

```text
150–220ms
```

El cambio entre tabs debe sentirse más rápido que entrar a una pantalla de detalle.

---

# Bottom sheets

Para menús y acciones contextuales, preferí bottom sheets estilo iPhone antes que modales centrados.

Usar para:

- elegir una opción
- agregar actividad
- elegir categoría
- seleccionar transporte
- adjuntar documento
- filtros
- acciones secundarias

Animación:

```text
translateY(100%)
→
translateY(0)
```

Fondo:

overlay oscuro sutil.

Mantener los safe areas del iPhone.

---

# Microinteracciones

Los botones pueden tener un feedback sutil al presionar.

Ejemplo:

```text
scale 1
→ 0.97
→ 1
```

Duración:

```text
100–160ms
```

Usarlo con moderación.

Nada de rebotes exagerados.

---

# Reduced motion

Respetar siempre:

```css
@media (prefers-reduced-motion: reduce)
```

Reducir o eliminar animaciones si está activado.

---

# Diseño mobile-first

La prioridad es la experiencia en iPhone.

Respetar:

- safe-area superior
- safe-area inferior
- Dynamic Island / notch
- home indicator
- teclado
- touch targets

Los elementos tocables deberían tener aproximadamente:

```text
44x44px
```

como mínimo cuando sea posible.

---

# Diseño específico para viajes

El usuario debe poder detectar rápidamente:

- día actual
- hora
- próxima actividad
- vuelo
- tren
- alojamiento
- reserva
- dirección
- ticket
- documento
- confirmación

Evitar esconder información importante detrás de varios taps.

La aplicación debe funcionar bien cuando el usuario está caminando, viajando o revisando información rápidamente.

---

# Itinerarios

Usar timeline cuando ayude.

Ejemplo:

```text
Martes 8 septiembre

09:30
Schönbrunn Palace
Entrada guardada

│

13:00
Almuerzo
Figlmüller

│

16:20
Tren a Bratislava
Wien Hbf → Bratislava hl.st.
```

No convertir automáticamente cada actividad en una tarjeta.

---

# Revisar componentes existentes primero

Antes de crear cualquier componente nuevo:

1. Buscar componentes similares existentes.
2. Buscar variables de colores.
3. Buscar estilos compartidos.
4. Buscar el menú principal.
5. Buscar el menú `+`.
6. Buscar botones.
7. Buscar inputs.
8. Buscar modales y sheets.
9. Reutilizar antes de duplicar.

No crear dos patrones visuales diferentes para hacer la misma función.

---

# Checklist antes de terminar una pantalla

Antes de dar por terminada cualquier modificación de UI, revisá:

- ¿Mantiene la paleta oficial?
- ¿Mantiene intacto el menú principal?
- ¿Mantiene intacto el botón `+` y su menú?
- ¿Hay demasiadas cards?
- ¿Hay cards que podrían convertirse en simples filas?
- ¿Hay sombras innecesarias?
- ¿Hay demasiados bordes?
- ¿Hay demasiados botones sólidos?
- ¿Las acciones secundarias podrían ser Ghost?
- ¿Los colores de categorías se usan solo como indicadores?
- ¿La jerarquía se entiende sin necesidad de cajas?
- ¿Se siente bien en iPhone?
- ¿Las transiciones son suaves?
- ¿La pantalla parece una aplicación real de consumo?
- ¿Parece una interfaz genérica creada por IA?

Si parece una interfaz genérica creada por IA, simplificarla antes de terminar.

# Regla principal

NosVamos no debe intentar verse "diseñada".

Debe sentirse natural.

El contenido del viaje debe ser el protagonista.

Usá tipografía, espacio, jerarquía, movimiento y pequeños indicadores de color antes que cards, sombras, badges y contenedores.