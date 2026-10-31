# Prueba piloto con personas reales

Las pruebas automáticas demuestran que cada misión **se puede resolver**; no que se **entienda** ni que la dificultad sea la adecuada. Eso solo lo dice gente aprendiendo con el juego. Esta guía organiza una prueba pequeña (3 a 5 personas) y aprovecha lo que el juego ya registra.

## Qué registra el juego

Todo se queda en el navegador de cada participante hasta que lo exporta:

- **Opinión por misión** (al final de cada misión, sección «Tu opinión sobre esta misión»): claridad de la explicación (clara, regular, confusa), dificultad del reto (fácil, justa, difícil) y un texto libre sobre dónde se atascó.
- **Datos de uso que ya guarda la partida**: cuántas veces comprobó el código en cada misión, cuántas pistas abrió, si vio la solución y si la completó.

En **Ajustes → Prueba piloto: tus opiniones**, «Descargar opiniones (.csv)» genera una tabla con una fila por misión opinada y esas columnas: `mision, titulo, mundo, claridad, dificultad, atasco, comprobaciones, pistas, vio_solucion, completada, fecha`. El archivo abre directamente en una hoja de cálculo.

## Participantes

- 3 a 5 personas con niveles distintos: al menos una que nunca haya programado y una que sepa algo de otro lenguaje.
- Explícales antes qué se recoge (lo de arriba), que es voluntario y que pueden revisar el archivo antes de enviarlo. El juego no envía nada por sí solo.

## Sesiones

1. **Primera sesión (45–60 min, con observación).** La persona crea su personaje, hace la evaluación inicial y juega desde la primera misión. Quien observa no ayuda salvo bloqueo de más de 5 minutos y anota:
   - dónde duda o relee;
   - qué pistas abre y si le sirven;
   - errores de Python que no entiende aunque el juego los traduzca;
   - cualquier cosa de la interfaz que no encuentre.
   Pídele que piense en voz alta.
2. **Una o dos semanas de uso libre**, 15–20 minutos al día (la meta diaria del juego). Pídele que deje su opinión en cada misión, sobre todo cuando algo no se entienda.
3. **Cierre (15 min).** La persona descarga sus opiniones (.csv) y, si quiere, su progreso (Ajustes → Exportar progreso) y te los envía. Preguntas finales:
   - ¿Qué misión recuerdas como la más clara? ¿Y la más confusa?
   - ¿En qué momento pensaste en dejarlo?
   - ¿Las pistas te ayudaban o te daban la respuesta?
   - ¿Volverías mañana? ¿Por qué?

## Cómo leer los resultados

Junta los CSV en una hoja y ordena por misión. Candidatas a revisar:

- dos o más personas la marcan **confusa**;
- muchas **comprobaciones** antes de completarla (más del doble que la media de su zona);
- **vio_solucion** en varias personas, o **completada** falso en quien sí avanzó después;
- el texto de **atasco** repite el mismo concepto.

Para cada misión señalada, lee sus textos de atasco y las notas de la observación, y decide si falta un paso en la intuición, si el ejemplo no prepara el reto o si una pista debería ir antes. Cambia el contenido en `web/src/content/missions/` y pasa las pruebas (`docs/AGREGAR_MISIONES.md`).

## Qué no concluir

Con 3–5 personas no hay estadística: no calcules medias de satisfacción ni compares mundos con números. Sirve para encontrar problemas concretos (una explicación que nadie entiende, un error que bloquea), no para medir.
