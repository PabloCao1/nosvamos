# Sistema de diseño

## Principios

1. Claridad antes que efecto visual.
2. Uso con una mano: controles frecuentes cerca del pulgar y superficies mínimas de 44 × 44 px.
3. Glass reservado para navegación y capas; las tarjetas con datos usan fondos sólidos.
4. Información crítica comunicada con texto, icono y color.

## Tokens

| Token | Valor | Uso |
|---|---:|---|
| Graphite | `#25272C` | texto, acciones principales |
| Sky Mint | `#B8F7E4` | selección, FAB, acentos |
| Violet | `#A78BFA` | transporte, vuelos y movimiento |
| Coral | `#FF9B82` | comida y experiencias sociales |
| Ice Blue | `#7DD3FC` | alojamiento e información |
| Amber | `#F7C873` | eventos, recordatorios y atención |
| Canvas | `#25272C` | fondo principal Graphite |
| Surface | `#303238` | tarjetas y formularios |
| Raised | `#383B42` | sheets y controles elevados |
| Text | `#F5F8F6` | texto principal |
| Muted | `#AEB5B2` | texto secundario |
| Mint alpha | `rgba(184,247,228,…)` | categorías y estados suaves |

Graphite y Sky Mint siguen siendo la identidad dominante. Violet, Coral, Ice Blue y Amber son acentos semánticos: se aplican principalmente con 10–16% de opacidad sobre superficies oscuras y en íconos, no como grandes fondos. Radios: 13 px en iconos, 17–21 px en tarjetas, 25–30 px en superficies protagonistas.

## Tipografía

- Texto y controles: `SF Pro Text` en Apple, con fallbacks Inter, Roboto y Segoe UI Variable.
- Títulos: `SF Pro Display` en Apple y fallback display del sistema.
- No se descargan webfonts: carga instantánea, funcionamiento offline y apariencia nativa en iPhone.
- Títulos con tracking negativo moderado; cuerpo con altura de línea 1.42.
- Pesos 650–760 para jerarquía sin depender de bold extremo.
- Labels secundarios en mayúsculas solamente cuando son breves.

## Componentes

- `BottomTabBar`: cápsula flotante de liquid glass, cinco destinos persistentes, reflejos internos y safe area.
- `FloatingActionButton`: 57 px, Sky Mint; despliega acciones contextuales hacia arriba como burbujas de vidrio, sin bloquear la pantalla con un sheet.
- `BottomSheet`: reservado para la ayuda de instalación; cierre por backdrop o Escape.
- `PageHeader`: eyebrow, título y una acción opcional.
- Los formularios de alta y edición siempre se presentan como páginas completas.
- Tarjetas de viaje, actividad, reserva y gasto.
- `StatusPill`, `ProgressBar`, avatar group y estados de página.
- `Icon`: única frontera con Reicon.

## Accesibilidad

- Objetivos táctiles de al menos 44 px.
- `focus-visible` consistente.
- Roles en tabs, progress bars, diálogos y estados.
- Labels accesibles en acciones solo-icono.
- `prefers-reduced-motion`.
- Contraste sólido en formularios y contenido; el glass no contiene textos extensos.

## iPhone

El shell usa `viewport-fit=cover`, `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`. La tab bar incorpora el inset dentro de su altura; el contenido reserva espacio adicional para tab bar y FAB.
