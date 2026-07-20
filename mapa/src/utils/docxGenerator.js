import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateDocx = async (year, activityLog) => {
  try {
    // Año fiscal: "Año 2026" = 1 Sept 2025 hasta 31 Ago 2026
    const yearNum = parseInt(year);
    const fiscalStart = new Date(yearNum - 1, 8, 1); // Sept 1 del año anterior
    const fiscalEnd = new Date(yearNum, 7, 31, 23, 59, 59, 999); // Ago 31 del año seleccionado

    const data = {};
    for (let i = 1; i <= 40; i++) {
      data[i] = { fman: '', completions: [] };
    }

    const currentNames = {};

    activityLog.forEach(log => {
      const tNum = parseInt(log.territoryNum);
      if (!tNum || tNum > 40) return;

      const logDate = new Date(log.date);

      if (!currentNames[tNum]) currentNames[tNum] = new Set();

      if (['completar_manzana', 'terminar_parcial', 'parcial_manzana'].includes(log.type)) {
        if (log.userName && log.userName !== 'Desconocido') {
          currentNames[tNum].add(log.userName);
        }
      } else if (log.type === 'territorio_completo') {
        // Solo incluir completados dentro del año fiscal seleccionado
        if (logDate >= fiscalStart && logDate <= fiscalEnd) {
          const dateStr = `${logDate.getDate()}/${logDate.getMonth() + 1}/${logDate.getFullYear()}`;

          const namesArray = Array.from(currentNames[tNum]);
          const formattedNamesArray = namesArray.map(name => {
            const parts = name.trim().split(' ');
            if (parts.length === 1) return parts[0];
            return parts[0] + ' ' + parts[1][0] + '.';
          });
          
          // Deduplicar nombres DESPUÉS de formatearlos
          const uniqueFormattedNames = Array.from(new Set(formattedNamesArray)).join('-');

          data[tNum].completions.push({ date: dateStr, names: uniqueFormattedNames });
          data[tNum].fman = dateStr;
        }
        currentNames[tNum].clear();
      }
    });

    const response = await fetch('/plantilla.docx');
    if (!response.ok) throw new Error('Plantilla no encontrada');
    const arrayBuffer = await response.arrayBuffer();

    const docxOptions = {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    };

    const createDocData = (offset) => {
      const docData = {};
      for (let i = 1; i <= 40; i++) {
        if (i <= 37) {
          docData[`tn${i}`] = i.toString();
          docData[`fman${i}`] = data[i].fman;
          for (let r = 0; r < 4; r++) {
            const comp = data[i].completions[offset + r];
            docData[`Ntn${i}R${r}`] = comp ? comp.names : '';
            docData[`ftn${i}R${r}`] = comp ? comp.date : '';
          }
        } else {
          docData[`tn${i}`] = '';
          docData[`fman${i}`] = '';
          for (let r = 0; r < 4; r++) {
            docData[`Ntn${i}R${r}`] = '';
            docData[`ftn${i}R${r}`] = '';
          }
        }
      }
      return docData;
    };

    let maxComps = 0;
    for (let i = 1; i <= 37; i++) {
      maxComps = Math.max(maxComps, data[i].completions.length);
    }
    const numFiles = Math.max(1, Math.ceil(maxComps / 4));

    if (numFiles === 1) {
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, docxOptions);
      doc.render(createDocData(0));
      const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(out, `Registro_Año_${year}.docx`);
    } else {
      const outZip = new JSZip();
      for (let f = 0; f < numFiles; f++) {
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, docxOptions);
        doc.render(createDocData(f * 4));
        const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        outZip.file(`Registro_Año_${year}_Parte${f+1}.docx`, out);
      }
      const content = await outZip.generateAsync({ type: 'blob' });
      saveAs(content, `Registro_Año_${year}_Completo.zip`);
    }
  } catch (error) {
    console.error('Error generando DOCX:', error);
    alert('Hubo un error al generar el archivo. Verifica la consola.');
  }
};
