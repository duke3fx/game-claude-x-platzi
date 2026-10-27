/**
 * Parses the ASCII world map into a solid-tile grid plus entity markers.
 * Legend characters are supplied by the content layer so this stays generic.
 */
export interface MapMarker {
  readonly char: string;
  readonly col: number;
  readonly row: number;
}

export interface ParsedMap {
  readonly cols: number;
  readonly rows: number;
  /** solid[row][col] === true when the cell is a wall/floor tile. */
  readonly solid: readonly (readonly boolean[])[];
  readonly markers: readonly MapMarker[];
}

export function parseAsciiMap(
  lines: readonly string[],
  solidChars: ReadonlySet<string>,
  emptyChars: ReadonlySet<string>,
): ParsedMap {
  const cols = Math.max(0, ...lines.map((line) => line.length));
  const solid: boolean[][] = [];
  const markers: MapMarker[] = [];

  lines.forEach((line, row) => {
    const solidRow: boolean[] = [];
    for (let col = 0; col < cols; col++) {
      const char = line[col] ?? ' ';
      const isSolid = solidChars.has(char);
      solidRow.push(isSolid);
      if (!isSolid && !emptyChars.has(char)) markers.push({ char, col, row });
    }
    solid.push(solidRow);
  });

  return { cols, rows: lines.length, solid, markers };
}
