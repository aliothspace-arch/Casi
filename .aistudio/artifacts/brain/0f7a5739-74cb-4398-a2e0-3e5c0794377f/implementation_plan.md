# Plan de Construcción de Boxes, Pavimentación de Pit Lane y Corrección de Pantalla Completa

Finalización estructural y arquitectónica de los garajes de boxes (pared posterior con portones de servicio y cerramiento completo), pavimentación continua de hormigón en la zona de trabajo del pit lane para eliminar el césped entre los garajes y la parada de monoplazas, y erradicación exhaustiva de la deformación visual al activar pantalla completa.

### Decisiones Críticas y Preferencias del Usuario

> [!IMPORTANT]
> Se han incorporado las elecciones directas del usuario:
> - **Pared trasera de garajes**: Fachada arquitectónica con portones de servicio motorizados (overhead rolling shutters) y accesos peatonales de equipo para cerrar completamente la nave.
> - **Zona de cemento**: Pavimentación integral de la franja de trabajo del pit lane, cubriendo toda el área desde la entrada de los boxes hasta donde se detiene el coche, eliminando por completo cualquier franja de césped visible.
> - **Adaptación de pantalla completa**: Adaptación total del campo de visión (FOV), proyección de cámara y resolución de buffer con `ResizeObserver` continuo y corrección de aspect ratio en shaders.

---

## 1. Visión General del Proyecto

1. **Cerramiento Estructural de Garajes (CurvedPitBuildingBuilder)**:
   - Los boxes actuales carecían de pared trasera sólida y cerramiento volumétrico (solo tenían un plano 2D delgado). Se implementará una fachada trasera completa de 96 metros con muros estructurales de hormigón/aluminio compuesto, pilares de soporte posteriores, portones enrollables de servicio de equipo y puertas técnicas de acceso para ingenieros y mecánicos.

2. **Pavimentación de Cemento en la Franja del Pit Lane**:
   - Entre la entrada de los garajes ($Z \approx -99$) y la posición de detención del monoplaza en la parada de boxes ($Z \approx -110.5$), existía una zona donde asomaba el terreno natural de césped.
   - Se creará una losa de hormigón técnico PBR continua ("Pit Apron & Working Lane Slab") que unirá el umbral de los garajes con el carril de parada del pit lane, con señalización de seguridad para mecánicos y sin ningún hueco de césped.

3. **Solución Exhaustiva a la Deformación en Pantalla Completa**:
   - Diagnóstico y resolución de los 4 factores que causaban la deformación:
     - `updateStyle: false` en `GraphicsQualityManager` que dejaba el estilo CSS del canvas en su resolución anterior mientras el buffer WebGL cambiaba.
     - Ausencia de `ResizeObserver` en el contenedor DOM del canvas, dejando la actualización a eventos `window.resize` que en transiciones de pantalla completa leen dimensiones intermedias o asíncronas.
     - Falta de re-sincronización tras el final de la animación de transición de pantalla completa (`fullscreenchange`).
     - Distorsión anamórfica en los shaders de post-procesado (`SpeedPostEffect` y `CinematicPostEffect`) por no compensar el aspect ratio en coordenadas UV.

---

## 2. Experiencia Visual y Diseño

### Cerramiento de Garajes y Paddock Posterior
- **Fachada Trasera**: Muro sólido con acabado arquitectónico PBR en paneles de composite gris oscuro y hormigón estructural.
- **Portones de Servicio**: Portones de garaje motorizados con relieve metálico horizontal acanalado y números de box identificativos (`#1`, `#2`, etc.).
- **Accesos Técnicos**: Puertas peatonales con marco de aluminio anodizado y balizas lumínicas discretas sobre cada dintel.
- **Techo y Laterales**: Volumetría cerrada y estanca sin caras invisibles ni culling invertido desde ningún ángulo de cámara.

### Pavimentación del Pit Apron
- **Material**: Hormigón técnico de alta resistencia con acabado PBR (`concretePBR` con rugosidad calibrada y juntas de dilatación periódicas).
- **Líneas de Guía y Seguridad**: Línea amarilla perimetral delimitando el carril de trabajo de los mecánicos (*Working Lane*) y el carril de tránsito (*Fast Lane*), integrándose limpiamente con la caja de parada pintada en el asfalto.

### Pantalla Completa Estable y Sin Deformaciones
- Al pulsar el botón de pantalla completa en el HUD o menú de pausa (o mediante atajo de teclado), la transición se realiza de manera 100% fluida:
  - El canvas mantiene su proporción exacta píxel por píxel.
  - La cámara recalcula inmediatamente su aspect ratio (`width / height`) sin estirar esferas, coches ni circuitos.
  - Las viñetas ópticas y efectos de velocidad radial se mantienen perfectamente circulares.

---

## 3. Decisiones Técnicas y Arquitectura

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│   ┌────────────────────────────────────────────────┐   │
│   │              Fullscreen Controller             │   │
│   │  - requestFullscreen en document.documentElement│   │
│   │  - Listener fullscreenchange + doble rAF delay │   │
│   └───────────────────────┬────────────────────────┘   │
└───────────────────────────┼────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  RacingGameEngine                      │
│   ┌────────────────────────────────────────────────┐   │
│   │               ResizeObserver Engine            │   │
│   │  - Observa containerRef directamente           │   │
│   │  - Recalcula w, h reales y camera.aspect       │   │
│   │  - Actualiza camera.updateProjectionMatrix()   │   │
│   │  - Sincroniza post-effects con uAspect         │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │            WebGLRenderer & Canvas CSS          │   │
│   │  - canvas.style.width = '100% !important'      │   │
│   │  - canvas.style.height = '100% !important'     │   │
│   │  - renderer.setSize(w, h, false) con buffer real│   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│          Arquitectura 3D de Boxes & Paddock            │
│                                                        │
│  [Asfalto Pista]                                       │
│        │                                               │
│  [Muro de Pit / Pit Wall]                              │
│        │                                               │
│  [Pit Lane Fast Lane (Asfalto)]                        │
│        │                                               │
│  [Pit Box / Zona Coche]                                │
│        │                                               │
│  [NUEVO Pit Apron de Hormigón] ◄─── Reemplaza césped   │
│        │                                               │
│  [Interior Boxes (Suelo Epoxy)]                        │
│        │                                               │
│  [NUEVA Pared Trasera con Portones] ◄─── Cerramiento   │
└────────────────────────────────────────────────────────┘
```

### 1. Reconstrucción de Boxes (`CurvedPitBuildingBuilder.ts`)
- Sustituir el plano simple de fondo por una geometría tridimensional completa de pared trasera de 96 m de longitud, 5.2 m de altura y 0.4 m de grosor.
- Generar portones seccionales enrollables para cada bahía de garaje utilizando texturizado procedural en relieve o mallas subdivididas con batched geometry.
- Añadir marcos de puertas peatonales y detalles de iluminación exterior para la fachada trasera.
- Añadir paredes divisorias y cerramientos laterales que completan la caja de cada garaje.

### 2. Losa de Cemento del Pit Apron (`CurvedPitBuildingBuilder.ts` y `TrackBuilder.ts`)
- Crear una losa de hormigón PBR de alta precisión que cubra la franja entre $Z = -99$ (frontal del garaje) y $Z = -112$ (límite del asfalto del pit lane), extendiéndose a lo largo de los boxes.
- Ajustar las elevaciones ($Y = 0.05$ m) con polígonos alineados para evitar cualquier efecto de z-fighting con el terreno inferior y asegurar que el césped quede 100% oculto bajo el pavimento de hormigón.
- Conectar visualmente la losa con los cajones de pit stop donde el coche se detiene para el cambio de neumáticos.

### 3. Solución Integral de Pantalla Completa
- **`RacingGameEngine.ts`**:
  - Incorporar un `ResizeObserver` vinculado a `this.container` con desconexión segura en `dispose()`.
  - Asegurar que el elemento canvas generado por Three.js tenga reglas de estilo `w-full h-full block` y que `this.renderer.setSize(w, h, false)` mantenga el aspect ratio nativo idéntico al del viewport.
  - Sincronizar el aspect ratio con `SpeedPostEffect` y `CinematicPostEffect` pasando el uniform `uAspect = w / h`.
- **`GraphicsQualityManager.ts`**:
  - Evitar que `applyProfile` desincronice el aspect ratio o asuma dimensiones obsoletas al alternar configuraciones.
- **`App.tsx`**:
  - Implementar un gestor de eventos de pantalla completa que, además de actualizar el estado de React, ejecute una llamada forzada a `engine.onResize()` tanto de forma inmediata como tras un retardo de 100ms y 250ms para cubrir toda la transición del navegador.

---

## Plan de Verificación

1. **Inspección Visual de Garajes**:
   - Situar la cámara de órbita y vista de boxes detrás del edificio para verificar que la pared trasera está 100% cerrada, con portones de servicio y sin huecos vacíos.
2. **Inspección de la Zona de Cemento**:
   - Recorrer el pit lane y verificar que la franja entre la entrada del box y la zona donde para el monoplaza es de hormigón continuo, sin presencia de césped ni parpadeos (z-fighting).
3. **Prueba de Pantalla Completa**:
   - Activar y desactivar la pantalla completa con el botón del HUD, el menú de pausa y la tecla `F11`.
   - Verificar que no hay estiramiento horizontal ni vertical, que el FOV se mantiene natural, y que el HUD y el canvas permanecen perfectamente alineados.
4. **Verificación de Compilación y Rendimiento**:
   - Ejecutar `compile_applet` y `lint_applet` para confirmar cero errores de tipos o sintaxis, manteniendo 60 FPS estables.
