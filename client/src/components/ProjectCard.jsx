const ProjectCard = ({ project }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatRole = (role) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const handleClick = () => {
    // TODO: Navigate to project page when route is ready
    console.log('Navigate to project:', project.id);
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
        {project.role && (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            {formatRole(project.role)}
          </span>
        )}
      </div>
      
      {project.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {project.updatedAt && (
            <span>Updated {formatDate(project.updatedAt)}</span>
          )}
          {project.memberCount !== undefined && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
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

