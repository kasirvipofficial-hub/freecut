import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/projects/new')({
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    width: 1920,
    height: 1080,
    fps: 30,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Create project using API/store
    console.log('Creating project:', formData);
    navigate({ to: '/projects' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="panel-header border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
            Create New Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your video editing workspace
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Details */}
          <div className="panel-bg border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h2 className="text-lg font-medium text-foreground">Project Details</h2>
            </div>

            <div className="space-y-5">
              {/* Project Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Enter project name..."
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
                  placeholder="Brief description of your project..."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Video Settings */}
          <div className="panel-bg border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h2 className="text-lg font-medium text-foreground">Video Settings</h2>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Resolution */}
              <div>
                <label htmlFor="resolution" className="block text-sm font-medium text-foreground mb-2">
                  Resolution
                </label>
                <Select
                  value={`${formData.width}x${formData.height}`}
                  onValueChange={(value) => {
                    const [width, height] = value.split('x').map(Number);
                    setFormData({ ...formData, width, height });
                  }}
                >
                  <SelectTrigger id="resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
                    <SelectItem value="1280x720">1280×720 (HD)</SelectItem>
                    <SelectItem value="3840x2160">3840×2160 (4K)</SelectItem>
                    <SelectItem value="2560x1440">2560×1440 (2K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frame Rate */}
              <div>
                <label htmlFor="fps" className="block text-sm font-medium text-foreground mb-2">
                  Frame Rate
                </label>
                <Select
                  value={formData.fps.toString()}
                  onValueChange={(value) => setFormData({ ...formData, fps: Number(value) })}
                >
                  <SelectTrigger id="fps">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 fps (Film)</SelectItem>
                    <SelectItem value="30">30 fps (Standard)</SelectItem>
                    <SelectItem value="60">60 fps (Smooth)</SelectItem>
                    <SelectItem value="120">120 fps (High Speed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 px-4 py-3 bg-secondary/50 border border-border rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-mono">Preview:</span>
                <span className="text-sm font-mono text-primary font-medium">
                  {formData.width}×{formData.height} @ {formData.fps}fps
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Link to="/projects">
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="lg" className="min-w-[160px]">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
