import { useNavigate } from 'react-router-dom';
import RoleBadge from './RoleBadge';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#4E86D9] transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#4E86D9] transition-colors">
          {project.name}
        </h3>
        {project.role && <RoleBadge role={project.role} />}
      </div>
      
      {project.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {project.updatedAt && (
            <span>Zaktualizowano {formatDate(project.updatedAt)}</span>
          )}
          {project.memberCount !== undefined && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {project.memberCount} {project.memberCount === 1 ? 'członek' : 'członków'}
            </span>
          )}
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4E86D9] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default ProjectCard;

