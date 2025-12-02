import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateSiteSummaryPDF, generateMultiSiteSummaryPDF } from '../services/pdfService';

export const getSiteSummaryPDF = async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    // Obtener información del sitio
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('address')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Obtener todas las tareas de la obra
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('site_id', siteId);

    if (tasksError) {
      return res.status(500).json({ error: 'Error fetching tasks' });
    }

    // Calcular estadísticas de tareas
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calcular breakdown por categorías
    const categoriesBreakdown: { [key: string]: { count: number; percentage: number } } = {};
    tasks?.forEach((task) => {
      const category = task.category || 'Sin categoría';
      if (!categoriesBreakdown[category]) {
        categoriesBreakdown[category] = { count: 0, percentage: 0 };
      }
      categoriesBreakdown[category].count++;
    });

    // Calcular porcentajes
    Object.keys(categoriesBreakdown).forEach((category) => {
      categoriesBreakdown[category].percentage =
        totalTasks > 0 ? Math.round((categoriesBreakdown[category].count / totalTasks) * 100) : 0;
    });

    // Obtener compras de la obra
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .eq('site_id', siteId);

    if (purchasesError) {
      return res.status(500).json({ error: 'Error fetching purchases' });
    }

    const totalPurchases = purchases?.length || 0;
    const purchasedMaterials =
      purchases?.filter((p) => p.status === 'purchased' || p.status === 'delivered').length || 0;
    const purchasedPercentage = totalPurchases > 0 ? Math.round((purchasedMaterials / totalPurchases) * 100) : 0;

    // Calcular dinero gastado (solo compras purchased o delivered)
    const totalSpent = purchases
      ?.filter((p) => p.status === 'purchased' || p.status === 'delivered')
      .reduce((sum, p) => sum + (p.price || 0), 0) || 0;

    // Generar PDF
    const pdfBuffer = await generateSiteSummaryPDF({
      totalTasks,
      completedTasks,
      completionPercentage,
      categoriesBreakdown,
      purchasedMaterials,
      totalPurchases,
      purchasedPercentage,
      totalSpent,
      siteName: siteData.address,
    });

    // Enviar PDF como respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=resumen-${siteData.address.replace(/\s+/g, '-')}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
};

export const getAllSitesSummaryPDF = async (req: Request, res: Response) => {
  try {
    // Obtener todas las obras
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, address')
      .order('address', { ascending: true });

    if (sitesError) {
      return res.status(500).json({ error: 'Error fetching sites' });
    }

    if (!sites || sites.length === 0) {
      return res.status(404).json({ error: 'No sites found' });
    }

    // Generar resumen para cada obra
    const summaries = await Promise.all(
      sites.map(async (site) => {
        // Obtener tareas
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('site_id', site.id);

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Categorías
        const categoriesBreakdown: { [key: string]: { count: number; percentage: number } } = {};
        tasks?.forEach((task) => {
          const category = task.category || 'Sin categoría';
          if (!categoriesBreakdown[category]) {
            categoriesBreakdown[category] = { count: 0, percentage: 0 };
          }
          categoriesBreakdown[category].count++;
        });

        Object.keys(categoriesBreakdown).forEach((category) => {
          categoriesBreakdown[category].percentage =
            totalTasks > 0 ? Math.round((categoriesBreakdown[category].count / totalTasks) * 100) : 0;
        });

        // Obtener compras
        const { data: purchases } = await supabase
          .from('purchases')
          .select('*')
          .eq('site_id', site.id);

        const totalPurchases = purchases?.length || 0;
        const purchasedMaterials =
          purchases?.filter((p) => p.status === 'purchased' || p.status === 'delivered').length || 0;
        const purchasedPercentage = totalPurchases > 0 ? Math.round((purchasedMaterials / totalPurchases) * 100) : 0;

        const totalSpent = purchases
          ?.filter((p) => p.status === 'purchased' || p.status === 'delivered')
          .reduce((sum, p) => sum + (p.price || 0), 0) || 0;

        return {
          totalTasks,
          completedTasks,
          completionPercentage,
          categoriesBreakdown,
          purchasedMaterials,
          totalPurchases,
          purchasedPercentage,
          totalSpent,
          siteName: site.address,
        };
      })
    );

    // Generar PDF con todos los resúmenes
    const pdfBuffer = await generateMultiSiteSummaryPDF(summaries);

    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=resumen-todas-obras.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating multi-site PDF:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
};
