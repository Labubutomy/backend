import React from 'react'
import { Button, Card, CardContent } from '@shared/ui'
import { Zap, Users, Brain, Shield, Clock, ArrowRight, TrendingUp, Target } from 'lucide-react'

export const LandingPage: React.FC = () => {
  const handleRoleSelection = (role: 'customer' | 'freelancer') => {
    // Navigate to appropriate signup page
    window.location.href = `/signup?role=${role}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10"></div>
        <div className="relative page-container py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">DevMatch AI</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Будущее фриланс-разработки. ИИ-подбор задач, автоматическая проверка качества и
              бесшовное управление проектами для разработчиков и клиентов.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                variant="gradient"
                className="text-lg px-8 py-4"
                onClick={() => handleRoleSelection('customer')}
              >
                <Users className="w-5 h-5 mr-2" />
                Я заказчик
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4"
                onClick={() => handleRoleSelection('freelancer')}
              >
                <Zap className="w-5 h-5 mr-2" />
                Я разработчик
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Активных разработчиков</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">95%</div>
                <div className="text-muted-foreground">Успешность ИИ</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">24ч</div>
                <div className="text-muted-foreground">Среднее время подбора</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="page-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Почему выбирают DevMatch AI?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Наша платформа сочетает искусственный интеллект с человеческой экспертизой для
              достижения непревзойденных результатов как для заказчиков, так и для разработчиков.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">ИИ-подбор задач</h3>
                <p className="text-muted-foreground">
                  Наш продвинутый ИИ анализирует требования проекта и навыки разработчика для поиска
                  идеального совпадения за секунды.
                </p>
              </CardContent>
            </Card>

            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Контроль качества</h3>
                <p className="text-muted-foreground">
                  Автоматические проверки кода, тестирование и контроль качества обеспечивают
                  высокие стандарты каждого проекта.
                </p>
              </CardContent>
            </Card>

            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-chart-green/20 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-chart-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Быстрая доставка</h3>
                <p className="text-muted-foreground">
                  Оптимизированный рабочий процесс и автоматизированные процессы сокращают время
                  выполнения проекта на 60%.
                </p>
              </CardContent>
            </Card>

            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-chart-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-chart-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Умная аналитика</h3>
                <p className="text-muted-foreground">
                  Отслеживание проектов в реальном времени и аналитика производительности помогают
                  оптимизировать процессы разработки.
                </p>
              </CardContent>
            </Card>

            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-chart-yellow/20 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-chart-yellow" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Точный подбор</h3>
                <p className="text-muted-foreground">
                  Подбор на основе навыков с точностью 95% гарантирует, что разработчики получают
                  проекты, в которых они преуспевают.
                </p>
              </CardContent>
            </Card>

            <Card className="task-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-chart-pink/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-chart-pink" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Глобальное сообщество</h3>
                <p className="text-muted-foreground">
                  Подключайтесь к топовым разработчикам по всему миру и получайте доступ к
                  разнообразным талантам.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="page-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Как это работает</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Просто, эффективно и мощно. Начните работу за минуты и увидите результаты немедленно.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* For Clients */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Для заказчиков</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Опубликуйте проект</h4>
                    <p className="text-muted-foreground">
                      Опишите ваши требования и позвольте нашему ИИ проанализировать сложность.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      ИИ найдет идеального исполнителя
                    </h4>
                    <p className="text-muted-foreground">
                      Наша система подберет вам идеального разработчика на основе навыков и
                      доступности.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Отслеживайте и проверяйте
                    </h4>
                    <p className="text-muted-foreground">
                      Следите за прогрессом в реальном времени и проверяйте выполненную работу с
                      помощью ИИ.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Developers */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Для разработчиков</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-foreground font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Укажите навыки</h4>
                    <p className="text-muted-foreground">
                      Определите уровни вашей экспертизы и позвольте нашему ИИ найти подходящие
                      проекты.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-foreground font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Получите подходящие задачи
                    </h4>
                    <p className="text-muted-foreground">
                      Получайте персонализированные рекомендации проектов на основе ваших навыков и
                      предпочтений.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-foreground font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Выполняйте и зарабатывайте
                    </h4>
                    <p className="text-muted-foreground">
                      Работайте в нашей песочнице и получайте оплату после успешного завершения.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="page-container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Готовы трансформировать ваш рабочий процесс разработки?
            </h2>
            <p className="text-muted-foreground mb-8">
              Присоединяйтесь к тысячам разработчиков и заказчиков, которые уже испытывают будущее
              фриланс-разработки.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="gradient"
                className="text-lg px-8 py-4"
                onClick={() => handleRoleSelection('customer')}
              >
                Начать как заказчик
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4"
                onClick={() => handleRoleSelection('freelancer')}
              >
                Присоединиться как разработчик
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-12">
        <div className="page-container">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DM</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">DevMatch AI</h3>
            </div>
            <p className="text-muted-foreground mb-4">Будущее фриланс-разработки уже здесь.</p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">
                Политика конфиденциальности
              </a>
              <a href="#" className="hover:text-foreground">
                Условия использования
              </a>
              <a href="#" className="hover:text-foreground">
                Контакты
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
