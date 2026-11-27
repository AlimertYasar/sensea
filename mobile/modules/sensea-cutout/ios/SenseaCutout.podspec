Pod::Spec.new do |s|
  s.name           = 'SenseaCutout'
  s.version        = '1.0.0'
  s.summary        = 'On-device background removal for Sensea wardrobe photos'
  s.description    = 'Uses Apple Vision (VNGenerateForegroundInstanceMaskRequest) on iOS 17+.'
  s.license        = 'MIT'
  s.author         = 'Alimert Yaşar'
  s.homepage       = 'https://github.com/AlimertYasar/sensea'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/AlimertYasar/sensea.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
