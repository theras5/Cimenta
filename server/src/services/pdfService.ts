import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ISiteSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  categoriesBreakdown: {
    [category: string]: {
      count: number;
      percentage: number;
    };
  };
  purchasedMaterials: number;
  totalPurchases: number;
  purchasedPercentage: number;
  totalSpent: number;
  siteName: string;
}

const categoryColors: { [key: string]: string } = {
  pintura: '#FF2D92',
  plomeria: '#FF9500',
  electricidad: '#007AFF',
  construccion: '#8A2BE2',
  default: '#10B981',
};

const getCategoryColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase().trim();
  return categoryColors[normalizedCategory] || categoryColors.default;
};

const hexToRGB = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [16, 185, 129]; // default green
};

export const generateSiteSummaryPDF = async (summary: ISiteSummary): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Resumen de Obra', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text(summary.siteName, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' })
      .moveDown(1.5);

    // Section 1: Tareas
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Tareas', 50, doc.y)
      .moveDown(0.5);

    // Draw completion circle representation
    const centerX = 300;
    const centerY = doc.y + 40;
    const radius = 35;

    // Background circle
    doc
      .circle(centerX, centerY, radius)
      .lineWidth(8)
      .strokeColor('#E5E7EB')
      .stroke();

    // Progress circle
    const progressColor =
      summary.completionPercentage >= 75
        ? '#10B981'
        : summary.completionPercentage >= 50
        ? '#F59E0B'
        : summary.completionPercentage >= 25
        ? '#EF4444'
        : '#9CA3AF';

    doc
      .circle(centerX, centerY, radius)
      .lineWidth(8)
      .strokeColor(progressColor)
      .stroke();

    // Percentage text
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`${summary.completionPercentage}%`, centerX - 30, centerY - 15, { width: 60, align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Completado', centerX - 30, centerY + 5, { width: 60, align: 'center' });

    doc.moveDown(5);

    // Task stats
    const statsY = doc.y;
    const colWidth = 150;

    doc.fontSize(10).fillColor('#6B7280').text('Total', 100, statsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(summary.totalTasks.toString(), 100, statsY + 15, { width: colWidth, align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Completadas', 250, statsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#10B981')
      .text(summary.completedTasks.toString(), 250, statsY + 15, { width: colWidth, align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Pendientes', 400, statsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#F59E0B')
      .text((summary.totalTasks - summary.completedTasks).toString(), 400, statsY + 15, {
        width: colWidth,
        align: 'center',
      });

    doc.moveDown(3);

    // Section 2: Categories
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Categorías de Tareas', 50, doc.y)
      .moveDown(0.5);

    if (Object.keys(summary.categoriesBreakdown).length > 0) {
      const sortedCategories = Object.entries(summary.categoriesBreakdown).sort((a, b) => b[1].count - a[1].count);

      sortedCategories.forEach(([category, data]) => {
        const yPos = doc.y;
        const barWidth = 400;
        const barHeight = 20;
        const color = hexToRGB(getCategoryColor(category));

        // Category name and count
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text(category.charAt(0).toUpperCase() + category.slice(1), 50, yPos);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(`${data.count} (${data.percentage}%)`, 460, yPos, { width: 100, align: 'right' });

        // Progress bar background
        doc
          .rect(50, yPos + 18, barWidth, barHeight)
          .fillColor('#E5E7EB')
          .fill();

        // Progress bar fill
        const fillWidth = (barWidth * data.percentage) / 100;
        doc
          .rect(50, yPos + 18, fillWidth, barHeight)
          .fill(getCategoryColor(category));

        doc.moveDown(2);
      });
    } else {
      doc.fontSize(10).fillColor('#6B7280').text('No hay tareas registradas', { align: 'center' });
      doc.moveDown(1);
    }

    // Section 3: Materiales
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Materiales Comprados', 50, doc.y)
      .moveDown(0.5);

    // Progress bar
    const purchaseBarY = doc.y;
    const purchaseBarWidth = 400;
    const purchaseBarHeight = 25;

    doc.fontSize(10).fillColor('#6B7280').text('Comprados', 50, purchaseBarY);

    doc
      .fontSize(10)
      .text(`${summary.purchasedMaterials} de ${summary.totalPurchases}`, 460, purchaseBarY, {
        width: 100,
        align: 'right',
      });

    // Progress bar background
    doc
      .rect(50, purchaseBarY + 18, purchaseBarWidth, purchaseBarHeight)
      .fillColor('#E5E7EB')
      .fill();

    // Progress bar fill
    const purchaseFillWidth = (purchaseBarWidth * summary.purchasedPercentage) / 100;
    doc
      .rect(50, purchaseBarY + 18, purchaseFillWidth, purchaseBarHeight)
      .fill('#3B82F6');

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`${summary.purchasedPercentage}%`, 50, purchaseBarY + 50, { width: purchaseBarWidth, align: 'center' });

    doc.moveDown(2.5);

    // Purchase stats
    const purchaseStatsY = doc.y;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Total Solicitudes', 100, purchaseStatsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(summary.totalPurchases.toString(), 100, purchaseStatsY + 15, { width: colWidth, align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Comprados', 250, purchaseStatsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#3B82F6')
      .text(summary.purchasedMaterials.toString(), 250, purchaseStatsY + 15, { width: colWidth, align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Pendientes', 400, purchaseStatsY, { width: colWidth, align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#F59E0B')
      .text((summary.totalPurchases - summary.purchasedMaterials).toString(), 400, purchaseStatsY + 15, {
        width: colWidth,
        align: 'center',
      });

    doc.moveDown(3);

    // Dinero gastado
    const moneyY = doc.y;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Dinero Gastado', 50, moneyY);
    
    doc.moveDown(0.5);
    
    // Box con dinero gastado
    const boxY = doc.y;
    doc
      .rect(50, boxY, 495, 50)
      .fill('#ECFDF5');
    
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text('Total Gastado en Compras Realizadas', 50, boxY + 10, { width: 495, align: 'center' });
    
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#059669')
      .text(
        `$${summary.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        50,
        boxY + 25,
        { width: 495, align: 'center' }
      );

    // Footer
    doc
      .moveDown(3)
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text('Este documento fue generado automáticamente por Cimenta', { align: 'center' });

    doc.end();
  });
};

export const generateMultiSiteSummaryPDF = async (summaries: ISiteSummary[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Main header
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('Resumen de Todas las Obras', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' })
      .moveDown(2);

    // Iterate through each site summary
    summaries.forEach((summary, index) => {
      // Add page break if not first site
      if (index > 0) {
        doc.addPage();
      }

      // Site header with border
      const headerY = doc.y;
      doc
        .rect(50, headerY - 10, 495, 40)
        .fill('#F3F4F6');

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`📍 ${summary.siteName}`, 60, headerY, { align: 'left' })
        .moveDown(1.5);

      // Section 1: Tareas
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Tareas', 50, doc.y)
        .moveDown(0.5);

      // Draw completion circle
      const centerX = 300;
      const centerY = doc.y + 40;
      const radius = 30;

      // Background circle
      doc
        .circle(centerX, centerY, radius)
        .lineWidth(6)
        .strokeColor('#E5E7EB')
        .stroke();

      // Progress circle
      const progressColor =
        summary.completionPercentage >= 75
          ? '#10B981'
          : summary.completionPercentage >= 50
          ? '#F59E0B'
          : summary.completionPercentage >= 25
          ? '#EF4444'
          : '#9CA3AF';

      doc
        .circle(centerX, centerY, radius)
        .lineWidth(6)
        .strokeColor(progressColor)
        .stroke();

      // Percentage text
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`${summary.completionPercentage}%`, centerX - 25, centerY - 12, { width: 50, align: 'center' });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text('Completado', centerX - 25, centerY + 5, { width: 50, align: 'center' });

      doc.moveDown(4);

      // Task stats
      const statsY = doc.y;
      const colWidth = 150;

      doc.fontSize(9).fillColor('#6B7280').text('Total', 100, statsY, { width: colWidth, align: 'center' });
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(summary.totalTasks.toString(), 100, statsY + 15, { width: colWidth, align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text('Completadas', 250, statsY, { width: colWidth, align: 'center' });
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#10B981')
        .text(summary.completedTasks.toString(), 250, statsY + 15, { width: colWidth, align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text('Pendientes', 400, statsY, { width: colWidth, align: 'center' });
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#F59E0B')
        .text((summary.totalTasks - summary.completedTasks).toString(), 400, statsY + 15, {
          width: colWidth,
          align: 'center',
        });

      doc.moveDown(2);

      // Section 2: Categories (compact version)
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Categorías', 50, doc.y)
        .moveDown(0.5);

      if (Object.keys(summary.categoriesBreakdown).length > 0) {
        const sortedCategories = Object.entries(summary.categoriesBreakdown).sort((a, b) => b[1].count - a[1].count);

        sortedCategories.forEach(([category, data]) => {
          const yPos = doc.y;
          const barWidth = 350;
          const barHeight = 15;
          const color = hexToRGB(getCategoryColor(category));

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#374151')
            .text(category.charAt(0).toUpperCase() + category.slice(1), 50, yPos);

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${data.count} (${data.percentage}%)`, 420, yPos, { width: 100, align: 'right' });

          doc
            .rect(50, yPos + 15, barWidth, barHeight)
            .fillColor('#E5E7EB')
            .fill();

          const fillWidth = (barWidth * data.percentage) / 100;
          doc
            .rect(50, yPos + 15, fillWidth, barHeight)
            .fill(getCategoryColor(category));

          doc.moveDown(1.5);
        });
      } else {
        doc.fontSize(9).fillColor('#6B7280').text('No hay tareas', { align: 'center' });
        doc.moveDown(1);
      }

      // Section 3: Materiales (compact)
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Materiales', 50, doc.y)
        .moveDown(0.5);

      const purchaseBarY = doc.y;
      const purchaseBarWidth = 350;
      const purchaseBarHeight = 20;

      doc.fontSize(9).fillColor('#6B7280').text('Comprados', 50, purchaseBarY);

      doc
        .fontSize(9)
        .text(`${summary.purchasedMaterials} de ${summary.totalPurchases}`, 420, purchaseBarY, {
          width: 100,
          align: 'right',
        });

      doc
        .rect(50, purchaseBarY + 15, purchaseBarWidth, purchaseBarHeight)
        .fillColor('#E5E7EB')
        .fill();

      const purchaseFillWidth = (purchaseBarWidth * summary.purchasedPercentage) / 100;
      doc
        .rect(50, purchaseBarY + 15, purchaseFillWidth, purchaseBarHeight)
        .fill('#3B82F6');

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`${summary.purchasedPercentage}%`, 50, purchaseBarY + 40, { width: purchaseBarWidth, align: 'center' });

      doc.moveDown(2);

      // Dinero gastado
      const moneyY = doc.y;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Dinero Gastado', 50, moneyY);
      
      doc.moveDown(0.3);
      
      const boxY = doc.y;
      doc
        .rect(50, boxY, 495, 45)
        .fill('#ECFDF5');
      
      doc
        .fontSize(9)
        .fillColor('#6B7280')
        .text('Total Gastado en Compras', 50, boxY + 8, { width: 495, align: 'center' });
      
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text(
          `$${summary.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          50,
          boxY + 22,
          { width: 495, align: 'center' }
        );

      doc.moveDown(2);
    });

    // Footer
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text('Este documento fue generado automáticamente por Cimenta', { align: 'center' });

    doc.end();
  });
};
