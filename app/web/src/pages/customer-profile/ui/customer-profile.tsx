import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@shared/ui'
import { Mail, Building, Phone, MapPin, Save } from 'lucide-react'

// Mock data for customer profile
const mockCustomerProfile = {
  user_id: 'client-1',
  display_name: 'ООО "ТехноСтарт"',
  email: 'contact@technostart.ru',
  company: 'ООО "ТехноСтарт"',
  phone: '+7 (495) 123-45-67',
  address: 'Москва, ул. Тверская, д. 1',
  website: 'https://technostart.ru',
  description:
    'Инновационная IT-компания, специализирующаяся на разработке мобильных приложений и веб-решений.',
}

export const CustomerProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [form, setForm] = React.useState({
    display_name: mockCustomerProfile.display_name,
    email: mockCustomerProfile.email,
    company: mockCustomerProfile.company,
    phone: mockCustomerProfile.phone,
    address: mockCustomerProfile.address,
    website: mockCustomerProfile.website,
    description: mockCustomerProfile.description,
  })

  const handleSave = () => {
    console.log('Saving profile:', form)
    setIsEditing(false)
    // Here would be API call to save profile
  }

  const handleCancel = () => {
    setForm({
      display_name: mockCustomerProfile.display_name,
      email: mockCustomerProfile.email,
      company: mockCustomerProfile.company,
      phone: mockCustomerProfile.phone,
      address: mockCustomerProfile.address,
      website: mockCustomerProfile.website,
      description: mockCustomerProfile.description,
    })
    setIsEditing(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Профиль компании</h1>
          <p className="text-muted-foreground">Управление информацией о вашей компании</p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Редактировать</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Название компании *
                </label>
                {isEditing ? (
                  <Input
                    value={form.display_name}
                    onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                    className="bg-card border-border"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Building className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{form.display_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-card border-border"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{form.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Телефон</label>
                {isEditing ? (
                  <Input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                    className="bg-card border-border"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{form.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Адрес</label>
                {isEditing ? (
                  <Input
                    value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Город, улица, дом"
                    className="bg-card border-border"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{form.address}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Веб-сайт</label>
                {isEditing ? (
                  <Input
                    value={form.website}
                    onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="bg-card border-border"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <a
                      href={form.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      {form.website}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Описание компании
                </label>
                {isEditing ? (
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Расскажите о вашей компании..."
                    rows={4}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-foreground">{form.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">12</div>
                <div className="text-sm text-muted-foreground">Созданных задач</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">8</div>
                <div className="text-sm text-muted-foreground">Завершенных проектов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">₽2,400,000</div>
                <div className="text-sm text-muted-foreground">Потрачено</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Изменить пароль
              </Button>
              <Button variant="outline" className="w-full">
                Двухфакторная аутентификация
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
