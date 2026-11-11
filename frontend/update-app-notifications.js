const fs = require('fs');
let content = fs.readFileSync('src/App.js', 'utf8');

// Ajouter les imports
if (!content.includes('NotificationCenter')) {
  content = content.replace(
    "import PortfolioTab from './components/PortfolioTab';",
    "import PortfolioTab from './components/PortfolioTab';\nimport NotificationCenter from './components/NotificationCenter';\nimport NotificationBell from './components/NotificationBell';"
  );
}

// Ajouter le state pour les notifications
if (!content.includes('showNotifications')) {
  content = content.replace(
    "const [activeTab, setActiveTab] = useState('markets');",
    "const [activeTab, setActiveTab] = useState('markets');\n  const [showNotifications, setShowNotifications] = useState(false);"
  );
}

fs.writeFileSync('src/App.js', content);
console.log('✅ App.js mis à jour pour notifications');
