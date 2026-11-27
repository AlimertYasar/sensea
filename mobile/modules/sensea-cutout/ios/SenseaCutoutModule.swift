import CoreImage
import ExpoModulesCore
import ImageIO
import UIKit
import Vision

public final class SenseaCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SenseaCutout")

    Function("isAvailable") { () -> Bool in
      #if targetEnvironment(simulator)
        return false  // Vision's foreground mask needs the Neural Engine of a real device
      #else
        if #available(iOS 17.0, *) { return true }
        return false
      #endif
    }

    // Runs off the main thread (Expo's module queue).
    AsyncFunction("removeBackground") { (uri: String) -> String? in
      guard #available(iOS 17.0, *) else { return nil }
      return try SenseaCutoutModule.cutout(uri: uri)
    }
  }

  @available(iOS 17.0, *)
  static func cutout(uri: String) throws -> String? {
    let url = URL(string: uri).flatMap { $0.scheme == nil ? nil : $0 } ?? URL(fileURLWithPath: uri)
    guard let data = try? Data(contentsOf: url), let image = UIImage(data: data), let cg = image.cgImage else {
      return nil
    }
    let handler = VNImageRequestHandler(cgImage: cg, orientation: CGImagePropertyOrientation(image.imageOrientation))
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    guard let result = request.results?.first, !result.allInstances.isEmpty else { return nil }

    // All detected foreground objects (a garment is usually one), cropped to their bounds.
    let buffer = try result.generateMaskedImage(
      ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
    let ci = CIImage(cvPixelBuffer: buffer)
    guard let space = CGColorSpace(name: CGColorSpace.sRGB),
      let png = CIContext().pngRepresentation(of: ci, format: .RGBA8, colorSpace: space)
    else { return nil }

    let out = FileManager.default.temporaryDirectory.appendingPathComponent("cutout-\(UUID().uuidString).png")
    try png.write(to: out)
    return out.absoluteString
  }
}

extension CGImagePropertyOrientation {
  init(_ o: UIImage.Orientation) {
    switch o {
    case .up: self = .up
    case .down: self = .down
    case .left: self = .left
    case .right: self = .right
    case .upMirrored: self = .upMirrored
    case .downMirrored: self = .downMirrored
    case .leftMirrored: self = .leftMirrored
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}
