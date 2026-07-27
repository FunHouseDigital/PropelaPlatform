import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const CATEGORIES = ['All', 'Getting Started', 'Nurses', 'Documents', 'Placements', 'Reports'];

function highlightText(text, query) {
  if (!query || query.trim().length === 0) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  // After split with a captured group, matched segments are at odd indices.
  // Using index parity avoids the g-flag lastIndex drift issue with .test().
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function KnowledgeBase() {
  const { helpArticles, articleVotes, updateHelpArticles, updateArticleVotes } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedArticle, setExpandedArticle] = useState(null);

  const filteredArticles = useMemo(() => {
    let articles = helpArticles;
    if (activeCategory !== 'All') {
      articles = articles.filter((a) => a.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return articles;
  }, [helpArticles, activeCategory, searchQuery]);

  const handleVote = (articleId, type) => {
    const currentVotes = { ...articleVotes };
    const articleKey = articleId;
    const existing = currentVotes[articleKey] || null;

    // Toggle vote off if same type clicked again
    if (existing === type) {
      delete currentVotes[articleKey];
    } else {
      currentVotes[articleKey] = type;
    }
    updateArticleVotes(currentVotes);

    // Update article counts
    const updatedArticles = helpArticles.map((a) => {
      if (a.id !== articleId) return a;
      const updated = { ...a };
      if (existing === 'helpful') updated.helpful = Math.max(0, updated.helpful - 1);
      if (existing === 'notHelpful') updated.notHelpful = Math.max(0, updated.notHelpful - 1);
      if (currentVotes[articleKey] === 'helpful') updated.helpful += 1;
      if (currentVotes[articleKey] === 'notHelpful') updated.notHelpful += 1;
      return updated;
    });
    updateHelpArticles(updatedArticles);
  };

  const getRelatedArticles = (article) => {
    if (!article.relatedArticles) return [];
    return helpArticles.filter((a) => article.relatedArticles.includes(a.id));
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#5B2D8E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Accordion */}
      <div className="space-y-2">
        {filteredArticles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BookOpen size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No articles found matching your search.</p>
          </div>
        )}
        {filteredArticles.map((article) => {
          const isExpanded = expandedArticle === article.id;
          const userVote = articleVotes[article.id] || null;
          return (
            <div key={article.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">
                    {highlightText(article.title, searchQuery)}
                  </h3>
                  <span className="text-xs text-[#5B2D8E] bg-[#5B2D8E]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {article.category}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {highlightText(article.content, searchQuery)}
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mt-3">
                    {article.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Voting */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Was this helpful?</span>
                    <button
                      onClick={() => handleVote(article.id, 'helpful')}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                        userVote === 'helpful'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                      }`}
                    >
                      <ThumbsUp size={12} />
                      <span>{article.helpful}</span>
                    </button>
                    <button
                      onClick={() => handleVote(article.id, 'notHelpful')}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                        userVote === 'notHelpful'
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <ThumbsDown size={12} />
                      <span>{article.notHelpful}</span>
                    </button>
                  </div>

                  {/* Related Articles */}
                  {getRelatedArticles(article).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Related Articles</p>
                      <div className="space-y-1">
                        {getRelatedArticles(article).map((related) => (
                          <button
                            key={related.id}
                            onClick={() => setExpandedArticle(related.id)}
                            className="block text-sm text-[#5B2D8E] hover:underline"
                          >
                            {related.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
