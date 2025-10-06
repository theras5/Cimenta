"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  BarChart3,
} from "lucide-react";
import Sidebar from "@/components/SideBar";

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "on-track" | "delayed" | "completed" | "at-risk";
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  teamMembers: number;
  completedTasks: number;
  totalTasks: number;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  name: string;
  completed: boolean;
  dueDate: string;
  description: string;
}

const initialProjects: Project[] = [
  {
    id: "1",
    name: "Construcción Casa Familiar",
    description: "Proyecto residencial de 150m² con 3 dormitorios",
    progress: 65,
    status: "on-track",
    startDate: "2025-06-01",
    endDate: "2025-12-15",
    budget: 85000,
    spent: 55250,
    teamMembers: 8,
    completedTasks: 13,
    totalTasks: 20,
    milestones: [
      {
        id: "1",
        name: "Fundación",
        completed: true,
        dueDate: "2025-07-15",
        description: "Excavación y cimientos",
      },
      {
        id: "2",
        name: "Estructura",
        completed: true,
        dueDate: "2025-08-30",
        description: "Columnas y vigas",
      },
      {
        id: "3",
        name: "Techos",
        completed: false,
        dueDate: "2025-10-15",
        description: "Instalación de techos",
      },
      {
        id: "4",
        name: "Instalaciones",
        completed: false,
        dueDate: "2025-11-30",
        description: "Electricidad y plomería",
      },
    ],
  },
  {
    id: "2",
    name: "Remodelación Oficina",
    description: "Modernización de espacios corporativos",
    progress: 85,
    status: "on-track",
    startDate: "2025-08-01",
    endDate: "2025-10-30",
    budget: 45000,
    spent: 38250,
    teamMembers: 5,
    completedTasks: 17,
    totalTasks: 20,
    milestones: [
      {
        id: "5",
        name: "Demolición",
        completed: true,
        dueDate: "2025-08-15",
        description: "Remoción de estructuras",
      },
      {
        id: "6",
        name: "Instalaciones",
        completed: true,
        dueDate: "2025-09-15",
        description: "Nuevas instalaciones",
      },
      {
        id: "7",
        name: "Acabados",
        completed: false,
        dueDate: "2025-10-15",
        description: "Pintura y detalles",
      },
      {
        id: "8",
        name: "Mobiliario",
        completed: false,
        dueDate: "2025-10-30",
        description: "Instalación de muebles",
      },
    ],
  },
  {
    id: "3",
    name: "Complejo Comercial",
    description: "Centro comercial de 3 plantas",
    progress: 35,
    status: "delayed",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    budget: 250000,
    spent: 87500,
    teamMembers: 15,
    completedTasks: 7,
    totalTasks: 25,
    milestones: [
      {
        id: "9",
        name: "Permisos",
        completed: true,
        dueDate: "2025-05-01",
        description: "Documentación legal",
      },
      {
        id: "10",
        name: "Excavación",
        completed: true,
        dueDate: "2025-06-15",
        description: "Preparación del terreno",
      },
      {
        id: "11",
        name: "Estructura Principal",
        completed: false,
        dueDate: "2025-11-30",
        description: "Construcción principal",
      },
      {
        id: "12",
        name: "Instalaciones",
        completed: false,
        dueDate: "2026-02-28",
        description: "Sistemas generales",
      },
    ],
  },
];

const statusConfig = {
  "on-track": {
    label: "En tiempo",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  delayed: {
    label: "Retrasado",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  completed: {
    label: "Completado",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
  },
  "at-risk": {
    label: "En riesgo",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
};

export default function AvancesPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: 0,
    teamMembers: 1,
    status: "on-track" as Project["status"],
  });

  const handleAddProject = () => {
    if (
      newProject.name &&
      newProject.description &&
      newProject.startDate &&
      newProject.endDate
    ) {
      const project: Project = {
        id: Date.now().toString(),
        name: newProject.name,
        description: newProject.description,
        progress: 0,
        status: newProject.status,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        budget: newProject.budget,
        spent: 0,
        teamMembers: newProject.teamMembers,
        completedTasks: 0,
        totalTasks: 1,
        milestones: [],
      };
      setProjects([...projects, project]);
      setNewProject({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        budget: 0,
        teamMembers: 1,
        status: "on-track",
      });
      setIsDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const calculateOverallProgress = () => {
    if (projects.length === 0) return 0;
    const totalProgress = projects.reduce(
      (sum, project) => sum + project.progress,
      0
    );
    return Math.round(totalProgress / projects.length);
  };

  const getTotalBudget = () => {
    return projects.reduce((sum, project) => sum + project.budget, 0);
  };

  const getTotalSpent = () => {
    return projects.reduce((sum, project) => sum + project.spent, 0);
  };

  const getTotalTeamMembers = () => {
    return projects.reduce((sum, project) => sum + project.teamMembers, 0);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Avances del Proyecto
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus size={20} className="mr-2" />
                Nuevo Proyecto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nombre del proyecto"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Descripción"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    placeholder="Fecha inicio"
                    value={newProject.startDate}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        startDate: e.target.value,
                      })
                    }
                  />
                  <Input
                    type="date"
                    placeholder="Fecha fin"
                    value={newProject.endDate}
                    onChange={(e) =>
                      setNewProject({ ...newProject, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Presupuesto"
                    value={newProject.budget}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        budget: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Miembros del equipo"
                    value={newProject.teamMembers}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        teamMembers: Number.parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <Button onClick={handleAddProject} className="w-full">
                  Crear Proyecto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Progreso General</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {calculateOverallProgress()}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Presupuesto Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(getTotalBudget())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gastado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(getTotalSpent())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-orange-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Equipo Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {getTotalTeamMembers()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="text-purple-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          {projects.map((project) => {
            const StatusIcon = statusConfig[project.status].icon;
            const budgetUsed = (project.spent / project.budget) * 100;

            return (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <p className="text-gray-600 mt-1">
                        {project.description}
                      </p>
                    </div>
                    <Badge className={statusConfig[project.status].color}>
                      <StatusIcon size={16} className="mr-1" />
                      {statusConfig[project.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Progress Section */}
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Progreso General
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {project.progress}%
                          </span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Uso del Presupuesto
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {budgetUsed.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={budgetUsed} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Gastado: {formatCurrency(project.spent)}</span>
                          <span>Total: {formatCurrency(project.budget)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Calendar
                              size={16}
                              className="text-gray-400 mr-1"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Inicio</p>
                          <p className="text-sm font-medium">
                            {new Date(project.startDate).toLocaleDateString(
                              "es-ES"
                            )}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Users size={16} className="text-gray-400 mr-1" />
                          </div>
                          <p className="text-xs text-gray-500">Equipo</p>
                          <p className="text-sm font-medium">
                            {project.teamMembers} personas
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <CheckCircle
                              size={16}
                              className="text-gray-400 mr-1"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Tareas</p>
                          <p className="text-sm font-medium">
                            {project.completedTasks}/{project.totalTasks}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Milestones Section */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">
                        Hitos del Proyecto
                      </h4>
                      <div className="space-y-3">
                        {project.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                milestone.completed
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            >
                              {milestone.completed && (
                                <CheckCircle size={12} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm font-medium ${
                                    milestone.completed
                                      ? "text-gray-900"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {milestone.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    milestone.dueDate
                                  ).toLocaleDateString("es-ES")}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {milestone.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
